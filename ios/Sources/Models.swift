import Foundation

/// Alle Health-Werte des heutigen Tages.
struct DayMetrics {
    var activeKcal: Double = 0     // Aktivkalorien (Bewegung/Training)
    var basalKcal: Double = 0      // Grundumsatz, bis jetzt aufgelaufen
    var steps: Double = 0
    var hrv: Double = 0            // Herzfrequenzvariabilität (SDNN, ms)
    var restingHR: Double = 0      // Ruhepuls (bpm)
    var sleepHours: Double = 0     // Schlaf der letzten Nacht
    var weightKg: Double = 0       // letztes gemessenes Gewicht

    var totalKcal: Double { activeKcal + basalKcal }
}

/// Ein Tageswert für Verlaufs-Charts.
struct DaySample: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}

/// 14-Tage-Vergleichsbasis, gegen die "heute" bewertet wird.
struct Baseline {
    var hrv: Double = 0
    var restingHR: Double = 0
    var tdee: Double = 0           // Ø Gesamtverbrauch der letzten 7 vollen Tage
}

/// Manuell erfasste Mahlzeit (optional zusätzlich nach Apple Health geschrieben).
struct Meal: Identifiable, Codable {
    var id = UUID()
    var name: String
    var kcal: Int
    var protein: Int
    var date: Date = Date()
}

final class MealStore: ObservableObject {
    @Published var meals: [Meal] = [] { didSet { save() } }
    private let key = "mm_meals"

    init() { load() }

    var todayMeals: [Meal] {
        meals.filter { Calendar.current.isDateInToday($0.date) }
    }
    var todayKcal: Int { todayMeals.reduce(0) { $0 + $1.kcal } }
    var todayProtein: Int { todayMeals.reduce(0) { $0 + $1.protein } }

    func add(_ meal: Meal) { meals.append(meal) }
    func remove(_ meal: Meal) { meals.removeAll { $0.id == meal.id } }

    private func save() {
        if let data = try? JSONEncoder().encode(meals) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
    private func load() {
        if let data = UserDefaults.standard.data(forKey: key),
           let stored = try? JSONDecoder().decode([Meal].self, from: data) {
            meals = stored
        }
    }
}
