import SwiftUI

struct AddAlarmView: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var alarmTime = Date()
    @State private var label = ""
    @State private var selectedSound = "Default Sound"
    @State private var snoozePenalty: Double = 0.0
    @State private var recurrenceDays: [String] = [] // New array for recurrence days

    let alarmSounds = ["Default Sound", "Chime", "Digital", "Radar", "Bell", "Birdsong"]
    let onSave: (Alarm) -> Void
    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Time")) {
                    DatePicker("Alarm Time", selection: $alarmTime, displayedComponents: .hourAndMinute)
                        .datePickerStyle(WheelDatePickerStyle())
                }

                Section(header: Text("Label")) {
                    TextField("Label", text: $label)
                }

                Section(header: Text("Sound")) {
                    Picker("Sound", selection: $selectedSound) {
                        ForEach(alarmSounds, id: \.self) { sound in
                            Text(sound).tag(sound)
                        }
                    }
                }

                Section(header: Text("Snooze Penalty")) {
                    Stepper(value: $snoozePenalty, in: 0...20, step: 0.5) {
                        Text("Penalty: \(snoozePenalty, specifier: "%.2f") $")
                    }
                }

                Section(header: Text("Repeat")) {
                    ForEach(daysOfWeek, id: \.self) { day in
                        MultipleSelectionRow(title: day, isSelected: recurrenceDays.contains(day)) {
                            if recurrenceDays.contains(day) {
                                recurrenceDays.removeAll { $0 == day }
                            } else {
                                recurrenceDays.append(day)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Add Alarm")
            .navigationBarItems(leading: Button("Cancel") {
                presentationMode.wrappedValue.dismiss()
            }, trailing: Button("Save") {
                let formatter = DateFormatter()
                formatter.dateFormat = "h:mm a"
                let alarm = Alarm(
                    time: formatter.string(from: alarmTime),
                    label: label,
                    isEnabled: true,
                    sound: selectedSound,
                    snoozePenalty: snoozePenalty,
                    isRecurring: !recurrenceDays.isEmpty,
                    recurrenceDays: recurrenceDays // Save the selected days
                )
                onSave(alarm)
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
}

struct MultipleSelectionRow: View {
    var title: String
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                if isSelected {
                    Spacer()
                    Image(systemName: "checkmark")
                }
            }
        }
    }
}
