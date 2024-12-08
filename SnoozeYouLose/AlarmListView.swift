import SwiftUI
import Firebase
import FirebaseFirestore

struct AlarmListView: View {
    @State private var alarms: [Alarm] = []
    @State private var showAddAlarmView = false

    // Reference to Firestore collection
    private let db = Firestore.firestore().collection("alarms")

    var body: some View {
        NavigationView {
            List {
                ForEach(alarms) { alarm in
                    NavigationLink(destination: EditAlarmView(alarm: binding(for: alarm), onSave: {
                        updateAlarm(alarm)
                    })) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(alarm.time)
                                    .font(.headline)
                                Text(alarm.label)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                            Toggle("", isOn: binding(for: alarm).isEnabled)
                                .labelsHidden()
                                .onChange(of: alarm.isEnabled) { newValue in
                                    updateAlarm(alarm)
                                }
                            Button(action: {
                                snoozeAlarm(alarm)
                            }) {
                                Image(systemName: "clock.arrow.2.circlepath")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
                .onDelete(perform: deleteAlarm)
            }
            .navigationTitle("Alarms")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    EditButton()
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showAddAlarmView = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddAlarmView) {
                AddAlarmView { newAlarm in
                    addAlarm(newAlarm)
                }
            }
            .onAppear {
                loadAlarms()
            }
        }
    }

    private func binding(for alarm: Alarm) -> Binding<Alarm> {
        guard let index = alarms.firstIndex(where: { $0.id == alarm.id }) else {
            fatalError("Alarm not found")
        }
        return $alarms[index]
    }

    // MARK: - Firestore Data Functions

    private func loadAlarms() {
        db.getDocuments { snapshot, error in
            if let error = error {
                print("Error loading alarms: \(error)")
                return
            }
            
            guard let documents = snapshot?.documents else { return }
            self.alarms = documents.compactMap { document in
                try? document.data(as: Alarm.self)
            }
        }
    }

    private func addAlarm(_ alarm: Alarm) {
        do {
            let docRef = db.document()
            var newAlarm = alarm
            newAlarm.id = docRef.documentID // Set Firestore document ID in the alarm
            try docRef.setData(from: newAlarm)
            
            // Schedule notification for the new alarm
            NotificationManager.shared.scheduleNotification(for: newAlarm)
            loadAlarms() // Refresh after adding
        } catch {
            print("Error adding alarm: \(error)")
        }
    }

    private func updateAlarm(_ alarm: Alarm) {
        guard let id = alarm.id else { return }
        do {
            try db.document(id).setData(from: alarm)
            
            // Update notification for the modified alarm
            NotificationManager.shared.removeNotification(for: id)
            NotificationManager.shared.scheduleNotification(for: alarm)
        } catch {
            print("Error updating alarm: \(error)")
        }
    }

    private func deleteAlarm(at offsets: IndexSet) {
        for index in offsets {
            let alarm = alarms[index]
            guard let id = alarm.id else { continue }
            
            db.document(id).delete { error in
                if let error = error {
                    print("Error deleting alarm: \(error)")
                } else {
                    // Remove the notification for the deleted alarm
                    NotificationManager.shared.removeNotification(for: id)
                    loadAlarms() // Refresh after deletion
                }
            }
        }
    }

    // MARK: - Snooze Action

    private func snoozeAlarm(_ alarm: Alarm) {
        let snoozeAmount = alarm.snoozePenalty // Penalty amount for snooze
        NotificationManager.shared.handleSnooze(for: alarm) // Snooze the alarm and update its time
        FirestoreManager().logPenalty(alarm: alarm, amount: snoozeAmount) // Log the penalty to Firestore
    }
}
