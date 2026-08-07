import Foundation
import Capacitor
import HealthKit

/// Apple Health fuer MaleMetrix.
///
/// Zweck: den geschaetzten Tagesverbrauch durch einen gemessenen ersetzen.
/// Der Planmotor rechnet bisher `Grundumsatz x Aktivitaetsfaktor` — der
/// Faktor kommt aus einem Auswahlfeld. Apple Health kennt den echten Wert
/// (Aktiv- plus Grundumsatz), sofern eine Uhr getragen wird.
///
/// Grundsaetze:
/// - Es wird nur gelesen, was der Plan wirklich braucht. Kein Vorratssammeln.
/// - Nichts verlaesst das Geraet. Das Plugin reicht Zahlen an die
///   Weboberflaeche derselben App weiter, mehr nicht.
/// - Fehlende Berechtigungen sind kein Fehler, sondern ein Zustand:
///   `authorized: false` statt einer Ausnahme. Apple sagt aus
///   Datenschutzgruenden ohnehin nicht, ob Lesen erlaubt wurde — deshalb
///   gilt hier als „verbunden", wenn nach der Abfrage Daten ankommen.
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "today", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "baseline", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeWeight", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    private let bpm = HKUnit.count().unitDivided(by: .minute())
    private let ms = HKUnit.secondUnit(with: .milli)
    private let kg = HKUnit.gramUnit(with: .kilo)

    private func qt(_ id: HKQuantityTypeIdentifier) -> HKQuantityType { HKQuantityType(id) }

    private var readTypes: Set<HKObjectType> {
        [
            qt(.activeEnergyBurned), qt(.basalEnergyBurned), qt(.stepCount),
            qt(.heartRateVariabilitySDNN), qt(.restingHeartRate), qt(.bodyMass),
            HKCategoryType(.sleepAnalysis)
        ]
    }

    /// Geschrieben wird nur das Gewicht, und nur wenn der Nutzer es eintraegt.
    private var writeTypes: Set<HKSampleType> { [qt(.bodyMass)] }

    // MARK: - Bruecke

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["available": false, "granted": false])
            return
        }
        store.requestAuthorization(toShare: writeTypes, read: readTypes) { ok, error in
            if let error = error {
                call.reject("Apple Health hat die Anfrage abgelehnt: \(error.localizedDescription)")
                return
            }
            // `ok` heisst nur „Dialog beantwortet", nicht „Lesen erlaubt".
            // Ob wirklich Daten kommen, zeigt erst die naechste Abfrage.
            call.resolve(["available": true, "granted": ok])
        }
    }

    @objc func today(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health ist auf diesem Geraet nicht verfuegbar")
            return
        }
        let cal = Calendar.current
        let now = Date()
        let start = cal.startOfDay(for: now)
        let group = DispatchGroup()
        var out: [String: Any] = [:]

        func put(_ key: String, _ value: Double?) {
            if let v = value, v.isFinite { out[key] = v }
        }

        group.enter()
        statistic(.activeEnergyBurned, unit: .kilocalorie(), from: start, to: now, options: .cumulativeSum) { v in
            put("activeKcal", v); group.leave()
        }
        group.enter()
        statistic(.basalEnergyBurned, unit: .kilocalorie(), from: start, to: now, options: .cumulativeSum) { v in
            put("basalKcal", v); group.leave()
        }
        group.enter()
        statistic(.stepCount, unit: .count(), from: start, to: now, options: .cumulativeSum) { v in
            put("steps", v); group.leave()
        }
        group.enter()
        statistic(.heartRateVariabilitySDNN, unit: ms, from: start, to: now, options: .discreteAverage) { v in
            put("hrvMs", v); group.leave()
        }
        group.enter()
        statistic(.restingHeartRate, unit: bpm, from: start, to: now, options: .discreteAverage) { v in
            put("restingHeartRate", v); group.leave()
        }
        group.enter()
        latestQuantity(.bodyMass, unit: kg) { v, date in
            put("weightKg", v)
            if let d = date { out["weightAt"] = ISO8601DateFormatter().string(from: d) }
            group.leave()
        }
        group.enter()
        sleepHours(endingAt: now) { v in put("sleepHours", v); group.leave() }

        group.notify(queue: .main) {
            // Ohne jeden Wert wurde entweder nichts erlaubt oder nichts erfasst.
            // Beides ist derselbe sichtbare Zustand: keine Daten.
            out["hasData"] = !out.filter { $0.key != "hasData" }.isEmpty
            call.resolve(out)
        }
    }

    /// 7-Tage-Mittel des GEMESSENEN Tagesverbrauchs plus 14-Tage-Vergleichswerte.
    /// Der heutige (unvollstaendige) Tag zaehlt nicht mit.
    @objc func baseline(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Apple Health ist auf diesem Geraet nicht verfuegbar")
            return
        }
        let group = DispatchGroup()
        var active: [Date: Double] = [:]
        var basal: [Date: Double] = [:]
        var hrv: [Double] = []
        var rhr: [Double] = []

        group.enter()
        dailySeries(.activeEnergyBurned, unit: .kilocalorie(), days: 8, options: .cumulativeSum) { m in
            active = m; group.leave()
        }
        group.enter()
        dailySeries(.basalEnergyBurned, unit: .kilocalorie(), days: 8, options: .cumulativeSum) { m in
            basal = m; group.leave()
        }
        group.enter()
        dailySeries(.heartRateVariabilitySDNN, unit: ms, days: 14, options: .discreteAverage) { m in
            hrv = m.values.filter { $0 > 0 }; group.leave()
        }
        group.enter()
        dailySeries(.restingHeartRate, unit: bpm, days: 14, options: .discreteAverage) { m in
            rhr = m.values.filter { $0 > 0 }; group.leave()
        }

        group.notify(queue: .main) {
            let today = Calendar.current.startOfDay(for: Date())
            // Nur volle Tage, an denen wirklich gemessen wurde. Ein Tag ohne
            // getragene Uhr liefert einen Bruchteil des Grundumsatzes — solche
            // Tage wuerden den Schnitt nach unten ziehen und damit ein zu
            // niedriges Kalorienziel erzeugen.
            var totals: [Double] = []
            for (day, b) in basal where day < today {
                let a = active[day] ?? 0
                let sum = a + b
                if b > 800 && sum > 1200 { totals.append(sum) }
            }
            var out: [String: Any] = ["tdeeDays": totals.count]
            if !totals.isEmpty {
                out["tdee"] = (totals.reduce(0, +) / Double(totals.count)).rounded()
            }
            if !hrv.isEmpty { out["hrvMs"] = hrv.reduce(0, +) / Double(hrv.count) }
            if !rhr.isEmpty { out["restingHeartRate"] = rhr.reduce(0, +) / Double(rhr.count) }
            call.resolve(out)
        }
    }

    /// Schreibt ein Gewicht nach Apple Health — nur auf ausdrueckliche Aktion.
    @objc func writeWeight(_ call: CAPPluginCall) {
        guard let kgValue = call.getDouble("kg"), kgValue > 20, kgValue < 400 else {
            call.reject("Ungueltiges Gewicht")
            return
        }
        let date = call.getString("date").flatMap { ISO8601DateFormatter().date(from: $0) } ?? Date()
        let sample = HKQuantitySample(
            type: qt(.bodyMass),
            quantity: HKQuantity(unit: kg, doubleValue: kgValue),
            start: date, end: date
        )
        store.save(sample) { ok, error in
            if let error = error {
                call.reject("Konnte nicht nach Apple Health schreiben: \(error.localizedDescription)")
            } else {
                call.resolve(["saved": ok])
            }
        }
    }

    // MARK: - Abfragebausteine

    private func statistic(_ id: HKQuantityTypeIdentifier, unit: HKUnit, from: Date, to: Date,
                           options: HKStatisticsOptions, done: @escaping (Double?) -> Void) {
        let predicate = HKQuery.predicateForSamples(withStart: from, end: to, options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: qt(id), quantitySamplePredicate: predicate,
                                      options: options) { _, stats, _ in
            let q = options == .cumulativeSum ? stats?.sumQuantity() : stats?.averageQuantity()
            done(q?.doubleValue(for: unit))
        }
        store.execute(query)
    }

    private func latestQuantity(_ id: HKQuantityTypeIdentifier, unit: HKUnit,
                                done: @escaping (Double?, Date?) -> Void) {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: qt(id), predicate: nil, limit: 1,
                                  sortDescriptors: [sort]) { _, samples, _ in
            guard let s = samples?.first as? HKQuantitySample else { done(nil, nil); return }
            done(s.quantity.doubleValue(for: unit), s.endDate)
        }
        store.execute(query)
    }

    /// Tageswerte der letzten `days` Tage, auf den Tagesanfang geschluesselt.
    private func dailySeries(_ id: HKQuantityTypeIdentifier, unit: HKUnit, days: Int,
                             options: HKStatisticsOptions, done: @escaping ([Date: Double]) -> Void) {
        let cal = Calendar.current
        let end = cal.startOfDay(for: Date()).addingTimeInterval(86400)
        guard let start = cal.date(byAdding: .day, value: -days, to: cal.startOfDay(for: Date())) else {
            done([:]); return
        }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKStatisticsCollectionQuery(
            quantityType: qt(id), quantitySamplePredicate: predicate, options: options,
            anchorDate: start, intervalComponents: DateComponents(day: 1))
        query.initialResultsHandler = { _, collection, _ in
            var out: [Date: Double] = [:]
            collection?.enumerateStatistics(from: start, to: end) { stats, _ in
                let q = options == .cumulativeSum ? stats.sumQuantity() : stats.averageQuantity()
                if let v = q?.doubleValue(for: unit), v > 0 {
                    out[cal.startOfDay(for: stats.startDate)] = v
                }
            }
            done(out)
        }
        store.execute(query)
    }

    /// Schlafstunden der letzten Nacht: alle „asleep"-Abschnitte der letzten
    /// 18 Stunden zusammengezaehlt (deckt auch spaete Schlafenszeiten ab).
    ///
    /// Die einzelnen Schlafphasen (Kern, Tief, REM) kennt HealthKit erst ab
    /// iOS 16 — deshalb steht das Mindestziel der App auf iOS 16.0.
    private func sleepHours(endingAt now: Date, done: @escaping (Double?) -> Void) {
        let start = now.addingTimeInterval(-18 * 3600)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: now, options: [])
        let query = HKSampleQuery(sampleType: HKCategoryType(.sleepAnalysis), predicate: predicate,
                                  limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
            guard let items = samples as? [HKCategorySample], !items.isEmpty else { done(nil); return }
            let asleep: Set<Int> = [
                HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                HKCategoryValueSleepAnalysis.asleepREM.rawValue,
                HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue
            ]
            let seconds = items
                .filter { asleep.contains($0.value) }
                .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
            done(seconds > 0 ? seconds / 3600 : nil)
        }
        store.execute(query)
    }
}
