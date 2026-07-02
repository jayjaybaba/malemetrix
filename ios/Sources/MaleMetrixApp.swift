import SwiftUI

@main
struct MaleMetrixApp: App {
    @StateObject private var health = HealthKitManager()
    @StateObject private var meals = MealStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(health)
                .environmentObject(meals)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var health: HealthKitManager

    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Heute", systemImage: "gauge.medium") }
            EnergyView()
                .tabItem { Label("Kalorien", systemImage: "flame.fill") }
            AnalysisView()
                .tabItem { Label("Analyse", systemImage: "chart.xyaxis.line") }
        }
        .task {
            if HealthKitManager.isAvailable {
                await health.requestAuthorization()
            }
        }
    }
}

enum Theme {
    static let accent = Color(red: 0.18, green: 0.49, blue: 0.96)   // #2e7cf6
    static let accent2 = Color(red: 0.0, green: 0.76, blue: 1.0)    // #00c2ff
    static let card = Color(red: 0.086, green: 0.106, blue: 0.149)  // #161b26
    static let green = Color(red: 0.176, green: 0.831, blue: 0.655)
    static let amber = Color(red: 0.961, green: 0.71, blue: 0.29)
    static let red = Color(red: 0.937, green: 0.353, blue: 0.353)
}
