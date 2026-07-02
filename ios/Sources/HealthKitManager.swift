import Foundation
import HealthKit

/// Zentrale HealthKit-Anbindung: Berechtigungen, Tageswerte, Verläufe,
/// Baseline und das Zurückschreiben von Mahlzeiten nach Apple Health.
@MainActor
final class HealthKitManager: ObservableObject {
    private let store = HKHealthStore()

    @Published var authorized = false
    @Published var today = DayMetrics()
    @Published var baseline = Baseline()
    @Published var kcalHistory: [DaySample] = []   // Aktivkalorien, 14 Tage
    @Published var hrvHistory: [DaySample] = []    // HRV, 14 Tage
    @Published var lastError: String?

    static var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    private func qt(_ id: HKQuantityTypeIdentifier) -> HKQuantityType { HKQuantityType(id) }

    // MARK: - Berechtigung

    func requestAuthorization() async {
        let read: Set<HKObjectType> = [
            qt(.activeEnergyBurned), qt(.basalEnergyBurned), qt(.stepCount),
            qt(.heartRateVariabilitySDNN), qt(.restingHeartRate), qt(.bodyMass),
            HKCategoryType(.sleepAnalysis), HKObjectType.workoutType()
        ]
        let write: Set<HKSampleType> = [qt(.dietaryEnergyConsumed), qt(.dietaryProtein)]
        do {
            try await store.requestAuthorization(toShare: write, read: read)
            authorized = true
            await refresh()
        } catch {
            lastError = error.localizedDescription
        }
    }

    // MARK: - Daten laden

    func refresh() async {
        let cal = Calendar.current
        let now = Date()
        let startOfDay = cal.startOfDay(for: now)
        let bpm = HKUnit.count().unitDivided(by: .minute())
        let ms = HKUnit.secondUnit(with: .milli)

        var t = DayMetrics()
        t.activeKcal = await sum(.activeEnergyBurned, unit: .kilocalorie(), from: startOfDay, to: now)
        t.basalKcal = await sum(.basalEnergyBurned, unit: .kilocalorie(), from: startOfDay, to: now)
        t.steps = await sum(.stepCount, unit: .count(), from: startOfDay, to: now)
        t.hrv = await average(.heartRateVariabilitySDNN, unit: ms, from: startOfDay, to: now)
        t.restingHR = await average(.restingHeartRate, unit: bpm, from: startOfDay, to: now)
        t.sleepHours = await sleepHours(endingAt: now)
        t.weightKg = await latest(.bodyMass, unit: .gramUnit(with: .kilo))
        today = t

        // Baseline: 14 Tage Vergleichswerte, TDEE aus den letzten 7 vollen Tagen
        let hrvSeries = await dailySeries(.heartRateVariabilitySDNN, unit: ms, days: 14, options: .discreteAverage)
        let rhrSeries = await dailySeries(.restingHeartRate, unit: bpm, days: 14, options: .discreteAverage)
        let activeSeries = await dailySeries(.activeEnergyBurned, unit: .kilocalorie(), days: 8)
        let basalSeries = await dailySeries(.basalEnergyBurned, unit: .kilocalorie(), days: 8)

        var b = Baseline()
        b.hrv = positiveAverage(hrvSeries.map(\.value))
        b.restingHR = positiveAverage(rhrSeries.map(\.value))
        let tdees = zip(activeSeries, basalSeries)
            .map { pair in pair.0.value + pair.1.value }
            .dropLast()               // heute (unvollständig) ausklammern
            .filter { $0 > 500 }      // Tage ohne getragene Watch ignorieren
        b.tdee = positiveAverage(Array(tdees))
        baseline = b

        kcalHistory = await dailySeries(.activeEnergyBurned, unit: .kilocalorie(), days: 14)
        hrvHistory = hrvSeries
    }

    /// 0–100: Tagesform aus HRV, Ruhepuls und Schlaf relativ zur eigenen Baseline.
    var readiness: Int? {
        guard baseline.hrv > 0, today.hrv > 0,
              baseline.restingHR > 0, today.restingHR > 0 else { return nil }
        let hrvRatio = clamp(today.hrv / baseline.hrv, 0.5, 1.5)
        let rhrRatio = clamp(baseline.restingHR / today.restingHR, 0.5, 1.5)
        let sleepRatio = clamp(today.sleepHours / 7.5, 0.4, 1.2)
        let weighted = 0.4 * hrvRatio + 0.3 * rhrRatio + 0.3 * sleepRatio
        // Baseline-Tag (~1.0) ergibt ~67, deutlich besser -> Richtung 100
        let score = (weighted - 0.6) / 0.6 * 100.0
        return Int(clamp(score, 0, 100))
    }

    // MARK: - Mahlzeit nach Apple Health schreiben

    func logMealToHealth(_ meal: Meal) async {
        let metadata = [HKMetadataKeyFoodType: meal.name]
        let samples = [
            HKQuantitySample(type: qt(.dietaryEnergyConsumed),
                             quantity: HKQuantity(unit: .kilocalorie(), doubleValue: Double(meal.kcal)),
                             start: meal.date, end: meal.date, metadata: metadata),
            HKQuantitySample(type: qt(.dietaryProtein),
                             quantity: HKQuantity(unit: .gram(), doubleValue: Double(meal.protein)),
                             start: meal.date, end: meal.date, metadata: metadata)
        ]
        do { try await store.save(samples) }
        catch { lastError = error.localizedDescription }
    }

    // MARK: - Query-Bausteine

    private func sum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, from: Date, to: Date) async -> Double {
        await statistic(id, unit: unit, from: from, to: to, options: .cumulativeSum)
    }

    private func average(_ id: HKQuantityTypeIdentifier, unit: HKUnit, from: Date, to: Date) async -> Double {
        await statistic(id, unit: unit, from: from, to: to, options: .discreteAverage)
    }

    private func statistic(_ id: HKQuantityTypeIdentifier, unit: HKUnit,
                           from: Date, to: Date, options: HKStatisticsOptions) async -> Double {
        await withCheckedContinuation { cont in
            let predicate = HKQuery.predicateForSamples(withStart: from, end: to, options: .strictStartDate)
            let query = HKStatisticsQuery(quantityType: qt(id),
                                          quantitySamplePredicate: predicate,
                                          options: options) { _, stats, _ in
                let value: Double
                if options == .cumulativeSum {
                    value = stats?.sumQuantity()?.doubleValue(for: unit) ?? 0
                } else {
                    value = stats?.averageQuantity()?.doubleValue(for: unit) ?? 0
                }
                cont.resume(returning: value)
            }
            store.execute(query)
        }
    }

    private func latest(_ id: HKQuantityTypeIdentifier, unit: HKUnit) async -> Double {
        await withCheckedContinuation { cont in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: qt(id), predicate: nil,
                                      limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let value = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit) ?? 0
                cont.resume(returning: value)
            }
            store.execute(query)
        }
    }

    /// Schlaf der letzten Nacht: alle "asleep"-Phasen der letzten 24 h.
    private func sleepHours(endingAt date: Date) async -> Double {
        await withCheckedContinuation { cont in
            let start = Calendar.current.date(byAdding: .hour, value: -24, to: date) ?? date
            let predicate = HKQuery.predicateForSamples(withStart: start, end: date, options: [])
            let query = HKSampleQuery(sampleType: HKCategoryType(.sleepAnalysis), predicate: predicate,
                                      limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, _ in
                let asleepValues = HKCategoryValueSleepAnalysis.allAsleepValues.map(\.rawValue)
                let seconds = (samples as? [HKCategorySample] ?? [])
                    .filter { asleepValues.contains($0.value) }
                    .reduce(0.0) { $0 + $1.endDate.timeIntervalSince($1.startDate) }
                cont.resume(returning: seconds / 3600.0)
            }
            store.execute(query)
        }
    }

    private func dailySeries(_ id: HKQuantityTypeIdentifier, unit: HKUnit, days: Int,
                             options: HKStatisticsOptions = .cumulativeSum) async -> [DaySample] {
        await withCheckedContinuation { cont in
            let cal = Calendar.current
            let end = Date()
            let anchor = cal.startOfDay(for: end)
            let start = cal.date(byAdding: .day, value: -days, to: anchor) ?? end
            let query = HKStatisticsCollectionQuery(
                quantityType: qt(id),
                quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end, options: []),
                options: options,
                anchorDate: anchor,
                intervalComponents: DateComponents(day: 1))
            query.initialResultsHandler = { _, collection, _ in
                var out: [DaySample] = []
                collection?.enumerateStatistics(from: start, to: end) { stats, _ in
                    let value: Double
                    if options == .cumulativeSum {
                        value = stats.sumQuantity()?.doubleValue(for: unit) ?? 0
                    } else {
                        value = stats.averageQuantity()?.doubleValue(for: unit) ?? 0
                    }
                    out.append(DaySample(date: stats.startDate, value: value))
                }
                cont.resume(returning: out)
            }
            store.execute(query)
        }
    }

    // MARK: - Helfer

    private func positiveAverage(_ values: [Double]) -> Double {
        let positive = values.filter { $0 > 0 }
        return positive.isEmpty ? 0 : positive.reduce(0, +) / Double(positive.count)
    }

    private func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double {
        min(max(v, lo), hi)
    }
}
