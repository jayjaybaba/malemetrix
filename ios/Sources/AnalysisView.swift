import SwiftUI
import Charts

/// "Analyse": 14-Tage-Verläufe aus Apple Health plus einfache Einordnung.
struct AnalysisView: View {
    @EnvironmentObject var health: HealthKitManager

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    chartCard(title: "Aktivkalorien · 14 Tage",
                              subtitle: trendText(for: health.kcalHistory, unit: "kcal", higherIsBetter: true)) {
                        Chart(health.kcalHistory) { sample in
                            BarMark(
                                x: .value("Tag", sample.date, unit: .day),
                                y: .value("kcal", sample.value)
                            )
                            .foregroundStyle(Theme.accent.gradient)
                            .cornerRadius(3)
                        }
                        .frame(height: 170)
                    }

                    chartCard(title: "HRV · 14 Tage",
                              subtitle: trendText(for: health.hrvHistory, unit: "ms", higherIsBetter: true)) {
                        Chart(health.hrvHistory.filter { $0.value > 0 }) { sample in
                            LineMark(
                                x: .value("Tag", sample.date, unit: .day),
                                y: .value("ms", sample.value)
                            )
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(Theme.green)
                            PointMark(
                                x: .value("Tag", sample.date, unit: .day),
                                y: .value("ms", sample.value)
                            )
                            .foregroundStyle(Theme.green)
                        }
                        .frame(height: 170)
                    }

                    insightsCard
                }
                .padding()
            }
            .navigationTitle("Analyse")
            .refreshable { await health.refresh() }
        }
    }

    private var insightsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("EINORDNUNG")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            insight(icon: "flame.fill", tint: Theme.amber, text: energyInsight)
            insight(icon: "waveform.path.ecg", tint: Theme.green, text: hrvInsight)
            insight(icon: "bed.double.fill", tint: Theme.accent, text: sleepInsight)
            Text("Alle Werte stammen aus Apple Health (Watch, Oura & Co. speisen dort ein). Die Analyse ist Orientierung, keine Diagnose.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
    }

    private var energyInsight: String {
        guard health.baseline.tdee > 0 else {
            return "Sobald ~1 Woche Verbrauchsdaten da ist, siehst du hier deinen echten Tagesverbrauch als Budget-Grundlage."
        }
        return "Dein Ø-Gesamtverbrauch liegt bei \(Int(health.baseline.tdee)) kcal/Tag. Für Fettabbau: moderates Defizit (300–500 kcal) — steuere es im Kalorien-Tab."
    }

    private var hrvInsight: String {
        guard health.baseline.hrv > 0, health.today.hrv > 0 else {
            return "HRV-Daten fehlen noch — sie kommen automatisch, sobald eine Watch oder ein Ring nachts getragen wird."
        }
        let diff = (health.today.hrv - health.baseline.hrv) / health.baseline.hrv * 100
        if diff >= 5 { return "HRV \(Int(diff)) % über deinem Schnitt — gute Erholung, dein Training wirkt." }
        if diff <= -10 { return "HRV \(Int(-diff)) % unter deinem Schnitt — Stress, Alkohol oder zu wenig Schlaf? Heute eher moderat." }
        return "HRV im Normalbereich deiner Baseline — alles im grünen Bereich."
    }

    private var sleepInsight: String {
        let h = health.today.sleepHours
        if h == 0 { return "Keine Schlafdaten der letzten Nacht gefunden." }
        if h >= 7 { return String(format: "%.1f h Schlaf — starke Basis für Training und Hormonhaushalt.", h) }
        return String(format: "%.1f h Schlaf — unter Ziel. Schlaf ist dein größter Hebel: heute früher ins Bett.", h)
    }

    private func insight(icon: String, tint: Color, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .frame(width: 22)
            Text(text)
                .font(.subheadline)
        }
    }

    private func trendText(for series: [DaySample], unit: String, higherIsBetter: Bool) -> String {
        let values = series.map(\.value).filter { $0 > 0 }
        guard values.count >= 4 else { return "Noch wenig Daten" }
        let half = values.count / 2
        let first = values.prefix(half).reduce(0, +) / Double(half)
        let second = values.suffix(values.count - half).reduce(0, +) / Double(values.count - half)
        guard first > 0 else { return "Noch wenig Daten" }
        let diff = (second - first) / first * 100
        let arrow = diff >= 0 ? "▲" : "▼"
        return "Trend: \(arrow) \(String(format: "%.0f", abs(diff))) % (Ø \(Int(second)) \(unit))"
    }

    private func chartCard<Content: View>(title: String, subtitle: String,
                                          @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            content()
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
    }
}
