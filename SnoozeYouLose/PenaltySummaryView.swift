import SwiftUI
import FirebaseFirestore

struct PenaltySummaryView: View {
    @State private var penaltyLogs: [PenaltyLogEntry] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    private let db = Firestore.firestore().collection("penaltyLogs")
    
    var body: some View {
        VStack {
            Text("Snooze Penalty Summary")
                .font(.title)
                .padding()

            if isLoading {
                ProgressView("Loading penalties...")
                    .padding()
            } else if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .padding()
            } else if penaltyLogs.isEmpty {
                Text("No penalty records found.")
                    .foregroundColor(.gray)
                    .padding()
            } else {
                List(penaltyLogs) { log in
                    VStack(alignment: .leading) {
                        Text(log.date)
                            .font(.headline)
                        Text("Alarm: \(log.alarmLabel)")
                        Text("Penalty: \(log.amount, specifier: "%.2f") $")
                            .foregroundColor(.red)
                    }
                    .padding()
                }
            }
        }
        .onAppear {
            fetchPenaltyLogs()  // Fetch penalty logs when the view appears
        }
        .navigationTitle("Penalty Summary")
    }
    
    // Fetch penalty logs from Firestore
    private func fetchPenaltyLogs() {
        isLoading = true
        errorMessage = nil // Reset error message
        db.getDocuments { snapshot, error in
            isLoading = false
            if let error = error {
                self.errorMessage = "Error loading penalty logs: \(error.localizedDescription)"
                return
            }
            
            // Convert snapshot to PenaltyLogEntry objects
            self.penaltyLogs = snapshot?.documents.compactMap { document in
                try? document.data(as: PenaltyLogEntry.self)
            } ?? []
        }
    }
}
