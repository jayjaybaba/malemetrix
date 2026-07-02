import SwiftUI

/// "Heute": Readiness-Ring + die wichtigsten Tageswerte aus Apple Health.
struct DashboardView: View {
    @EnvironmentObject var health: HealthKitManager

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if !HealthKitManager.isAvailable {
                        notice("Apple Health ist auf diesem Gerät nicht verfügbar.")
                    } else if let error = health.lastError {
                        notice("Health-Fehler: \(error)")
                    }

                    readinessCard

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        MetricCard(icon: "flame.fill", tint: Theme.amber,
                                   title: "Verbrauch heute",
                                   value: format(health.today.totalKcal),
                                   unit: "kcal",
                                   footnote: "davon \(format(health.today.activeKcal)) aktiv")
                        MetricCard(icon: "figure.walk", tint: Theme.accent2,
                                   title: "Schritte",
                                   value: format(health.today.steps),
                                   unit: "", footnote: "Ziel: 8.000+")
                        MetricCard(icon: "bed.double.fill", tint: Theme.accent,
                                   title: "Schlaf",
                                   value: String(format: "%.1f", health.today.sleepHours),
                                   unit: "h", footnote: "Ziel: 7–9 h")
                        MetricCard(icon: "waveform.path.ecg", tint: Theme.green,
                                   title: "HRV",
                                   value: format(health.today.hrv),
                                   unit: "ms",
                                   footnote: baselineNote(health.today.hrv, health.baseline.hrv, higherIsBetter: true))
                        MetricCard(icon: "heart.fill", tint: Theme.red,
                                   title: "Ruhepuls",
                                   value: format(health.today.restingHR),
                                   unit: "bpm",
                                   footnote: baselineNote(health.today.restingHR, health.baseline.restingHR, higherIsBetter: false))
                        MetricCard(icon: "scalemass.fill", tint: .gray,
                                   title: "Gewicht",
                                   value: health.today.weightKg > 0 ? String(format: "%.1f", health.today.weightKg) : "–",
                                   unit: "kg", footnote: "letzte Messung")
                    }
                }
                .padding()
            }
            .navigationTitle("Heute")
            .refreshable { await health.refresh() }
        }
    }

    private var readinessCard: some View {
        VStack(spacing: 10) {
            if let score = health.readiness {
                ZStack {
                    Circle()
                        .stroke(Theme.card, lineWidth: 14)
                    Circle()
                        .trim(from: 0, to: CGFloat(score) / 100)
                        .stroke(scoreColor(score), style: StrokeStyle(lineWidth: 14, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    VStack {
                        Text("\(score)")
                            .font(.system(size: 44, weight: .bold, design: .rounded))
                        Text("READINESS")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(width: 150, height: 150)
                Text(scoreText(score))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            } else {
                Image(systemName: "heart.text.square")
                    .font(.largeTitle)
                    .foregroundStyle(Theme.accent)
                Text("Noch keine Readiness: Es fehlen HRV-/Ruhepuls-Daten (Apple Watch, Oura o. ä.). Sobald ~1 Woche Daten da ist, erscheint hier deine Tagesform.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(22)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
    }

    private func scoreColor(_ s: Int) -> Color {
        s >= 67 ? Theme.green : (s >= 45 ? Theme.amber : Theme.red)
    }
    private func scoreText(_ s: Int) -> String {
        if s >= 67 { return "Gute Erholung — heute kann es ein harter Trainingstag sein." }
        if s >= 45 { return "Solide. Normales Training ist drin, nichts erzwingen." }
        return "Erholung im Keller — heute moderat bewegen statt hart trainieren."
    }

    private func baselineNote(_ today: Double, _ base: Double, higherIsBetter: Bool) -> String {
        guard today > 0, base > 0 else { return "Ø fehlt noch" }
        let diff = (today - base) / base * 100
        let arrow = diff >= 0 ? "▲" : "▼"
        let good = higherIsBetter ? diff >= 0 : diff <= 0
        return "\(arrow) \(String(format: "%.0f", abs(diff))) % vs. Ø\(good ? "" : " (beobachten)")"
    }

    private func format(_ v: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: v)) ?? "0"
    }

    private func notice(_ text: String) -> some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
    }
}

struct MetricCard: View {
    let icon: String
    let tint: Color
    let title: String
    let value: String
    let unit: String
    let footnote: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(.caption.weight(.semibold))
                .foregroundStyle(tint)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                if !unit.isEmpty {
                    Text(unit).font(.caption).foregroundStyle(.secondary)
                }
            }
            Text(footnote)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 14))
    }
}
