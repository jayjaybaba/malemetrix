import SwiftUI
import UserNotifications

/// Wochenplan nach dem MaleMetrix-Prinzip: jeden Tag 20–30 min Bewegung,
/// an 2–3 Tagen Gym — plus die tägliche Morgen-Erinnerung, die dem Nutzer
/// jeden Tag sagt, was heute dran ist.
struct TrainingPlan: Codable {
    /// Calendar-weekday (1 = Sonntag … 7 = Samstag, als String-Key) -> Plan-Name
    var gymDays: [String: String] = ["2": "Push", "4": "Pull", "6": "Legs"]
    var dailyMinutes: Int = 25
    var reminderEnabled: Bool = false
    var reminderHour: Int = 7
    var reminderMinute: Int = 0

    func template(forWeekday weekday: Int) -> String? {
        gymDays[String(weekday)]
    }

    static let templates = ["Push", "Pull", "Legs", "Ganzkörper A", "Ganzkörper B", "Oberkörper", "Unterkörper"]

    static func load() -> TrainingPlan {
        guard let data = UserDefaults.standard.data(forKey: "mm_training_plan"),
              let plan = try? JSONDecoder().decode(TrainingPlan.self, from: data) else {
            return TrainingPlan()
        }
        return plan
    }
    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: "mm_training_plan")
        }
    }
}

/// Plant pro Wochentag eine wiederkehrende lokale Notification.
enum ReminderScheduler {
    static let idPrefix = "mm_daily_"

    static func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        do {
            return try await center.requestAuthorization(options: [.alert, .sound, .badge])
        } catch { return false }
    }

    static func reschedule(for plan: TrainingPlan) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: (1...7).map { idPrefix + String($0) })
        guard plan.reminderEnabled else { return }

        for weekday in 1...7 {
            let content = UNMutableNotificationContent()
            if let tpl = plan.template(forWeekday: weekday) {
                content.title = "Heute ist Gym-Tag 🏋️"
                content.body = "\(tpl) steht an. Dein letztes Training wartet darauf, geschlagen zu werden."
            } else {
                content.title = "Dein Tagesziel 🚶"
                content.body = "\(plan.dailyMinutes) Minuten Bewegung — Gehen, Core oder Mobility. Kein Null-Tag, die Kette hält."
            }
            content.sound = .default

            var comps = DateComponents()
            comps.weekday = weekday
            comps.hour = plan.reminderHour
            comps.minute = plan.reminderMinute
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
            let request = UNNotificationRequest(identifier: idPrefix + String(weekday),
                                                content: content, trigger: trigger)
            center.add(request)
        }
    }
}

/// "Training"-Tab: Heute-Karte, Wochenübersicht, Plan-Editor und Erinnerung.
struct TrainingView: View {
    @State private var plan = TrainingPlan.load()
    @State private var reminderTime = Date()
    @State private var permissionDenied = false

    /// Anzeige-Reihenfolge Mo–So mit Calendar-weekday-Nummern.
    private let weekOrder: [(num: Int, name: String)] = [
        (2, "Montag"), (3, "Dienstag"), (4, "Mittwoch"), (5, "Donnerstag"),
        (6, "Freitag"), (7, "Samstag"), (1, "Sonntag")
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    todayCard
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                }

                Section("Morgen-Erinnerung") {
                    Toggle("Jeden Morgen erinnern", isOn: Binding(
                        get: { plan.reminderEnabled },
                        set: { newValue in
                            plan.reminderEnabled = newValue
                            if newValue {
                                Task {
                                    let ok = await ReminderScheduler.requestPermission()
                                    if !ok {
                                        plan.reminderEnabled = false
                                        permissionDenied = true
                                    }
                                    persist()
                                }
                            } else {
                                persist()
                            }
                        }))
                    if plan.reminderEnabled {
                        DatePicker("Uhrzeit", selection: $reminderTime, displayedComponents: .hourAndMinute)
                            .onChange(of: reminderTime) { _ in
                                let comps = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
                                plan.reminderHour = comps.hour ?? 7
                                plan.reminderMinute = comps.minute ?? 0
                                persist()
                            }
                    }
                    if permissionDenied {
                        Text("Mitteilungen sind deaktiviert. Erlaube sie unter Einstellungen → MaleMetrix → Mitteilungen.")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } footer: {
                    Text("Die Erinnerung kennt deinen Plan: an Gym-Tagen meldet sie das Workout, an allen anderen dein Bewegungsziel.")
                }

                Section("Deine Gym-Tage") {
                    ForEach(weekOrder, id: \.num) { day in
                        HStack {
                            Toggle(day.name, isOn: Binding(
                                get: { plan.gymDays[String(day.num)] != nil },
                                set: { on in
                                    if on { plan.gymDays[String(day.num)] = "Push" }
                                    else { plan.gymDays[String(day.num)] = nil }
                                    persist()
                                }))
                            if plan.gymDays[String(day.num)] != nil {
                                Picker("", selection: Binding(
                                    get: { plan.gymDays[String(day.num)] ?? "Push" },
                                    set: { plan.gymDays[String(day.num)] = $0; persist() }))
                                {
                                    ForEach(TrainingPlan.templates, id: \.self) { Text($0) }
                                }
                                .labelsHidden()
                                .frame(width: 150)
                            }
                        }
                    }
                } footer: {
                    Text("MaleMetrix-Prinzip: 2–3 Gym-Tage (z. B. Push/Pull/Legs) — an allen anderen Tagen zählt die tägliche Bewegung.")
                }

                Section("Tägliche Bewegung") {
                    Stepper("Ziel: \(plan.dailyMinutes) Minuten", value: Binding(
                        get: { plan.dailyMinutes },
                        set: { plan.dailyMinutes = $0; persist() }), in: 10...90, step: 5)
                }
            }
            .navigationTitle("Training")
            .onAppear {
                var comps = DateComponents()
                comps.hour = plan.reminderHour
                comps.minute = plan.reminderMinute
                reminderTime = Calendar.current.date(from: comps) ?? Date()
            }
        }
    }

    private var todayCard: some View {
        let weekday = Calendar.current.component(.weekday, from: Date())
        let tpl = plan.template(forWeekday: weekday)
        return VStack(alignment: .leading, spacing: 8) {
            Text(tpl != nil ? "HEUTE IST GYM-TAG" : "DEIN TAGESZIEL")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(tpl != nil ? Theme.amber : Theme.accent)
            Text(tpl != nil ? "🏋️ \(tpl!)" : "🚶 \(plan.dailyMinutes)–\(plan.dailyMinutes + 5) min Bewegung")
                .font(.title2.weight(.bold))
            Text(tpl != nil
                 ? "Logge deine Sätze im MaleMetrix Tracker und schlag dein letztes Mal."
                 : "Gehen, Mobility, Core oder Eigengewicht — Hauptsache, die Kette reißt nicht.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
    }

    private func persist() {
        plan.save()
        ReminderScheduler.reschedule(for: plan)
    }
}
