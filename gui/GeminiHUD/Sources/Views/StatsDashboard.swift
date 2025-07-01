import SwiftUI
import Charts

struct StatsDashboard: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var statsManager = StatsManager()
    @State private var selectedTimeRange = TimeRange.last24Hours
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("Performance Metrics")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(appState.currentTheme.foregroundColor)
                
                Spacer()
                
                Picker("Time Range", selection: $selectedTimeRange) {
                    ForEach(TimeRange.allCases, id: \.self) { range in
                        Text(range.label).tag(range)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }
            .padding(.horizontal)
            
            // Stats Grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                // Token Usage Card
                StatsCard(
                    title: "Token Usage",
                    value: formatNumber(statsManager.totalTokens),
                    subtitle: "↑ \(statsManager.tokenGrowth)% from last period",
                    icon: "bolt.fill",
                    color: appState.currentTheme.accentColor
                )
                
                // Response Time Card
                StatsCard(
                    title: "Avg Response Time",
                    value: "\(statsManager.avgResponseTime)ms",
                    subtitle: statsManager.responseTimeTrend,
                    icon: "speedometer",
                    color: .green
                )
                
                // Tool Calls Card
                StatsCard(
                    title: "Tool Calls",
                    value: "\(statsManager.toolCallCount)",
                    subtitle: "Most used: \(statsManager.mostUsedTool)",
                    icon: "wrench.and.screwdriver.fill",
                    color: .orange
                )
                
                // Efficiency Score Card
                StatsCard(
                    title: "Efficiency Score",
                    value: "\(statsManager.efficiencyScore)%",
                    subtitle: statsManager.efficiencyTrend,
                    icon: "chart.line.uptrend.xyaxis",
                    color: .purple
                )
            }
            .padding(.horizontal)
            
            // Charts Section
            VStack(alignment: .leading, spacing: 12) {
                Text("Activity Timeline")
                    .font(.headline)
                    .foregroundColor(appState.currentTheme.foregroundColor)
                
                ActivityChart(dataPoints: statsManager.activityData)
                    .frame(height: 150)
            }
            .padding()
            .background(appState.currentTheme.backgroundColor.opacity(0.3))
            .cornerRadius(12)
            .padding(.horizontal)
            
            Spacer()
        }
        .padding(.vertical)
        .frame(width: 600, height: 500)
        .background(VisualEffectView())
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(appState.currentTheme.borderColor, lineWidth: 1)
        )
    }
    
    private func formatNumber(_ number: Int) -> String {
        if number >= 1000 {
            return String(format: "%.1fk", Double(number) / 1000)
        }
        return "\(number)"
    }
}

struct StatsCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let color: Color
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Spacer()
            }
            
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(appState.currentTheme.foregroundColor)
            
            Text(title)
                .font(.subheadline)
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.7))
            
            Text(subtitle)
                .font(.caption)
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(appState.currentTheme.backgroundColor.opacity(0.5))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
    }
}

struct ActivityChart: View {
    let dataPoints: [ActivityDataPoint]
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Chart(dataPoints) { point in
            AreaMark(
                x: .value("Time", point.date),
                y: .value("Activity", point.value)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [
                        appState.currentTheme.accentColor.opacity(0.6),
                        appState.currentTheme.accentColor.opacity(0.1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)
            
            LineMark(
                x: .value("Time", point.date),
                y: .value("Activity", point.value)
            )
            .foregroundStyle(appState.currentTheme.accentColor)
            .lineStyle(StrokeStyle(lineWidth: 2))
            .interpolationMethod(.catmullRom)
        }
        .chartXAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                    .foregroundStyle(appState.currentTheme.borderColor.opacity(0.2))
                AxisValueLabel()
                    .foregroundStyle(appState.currentTheme.foregroundColor.opacity(0.5))
            }
        }
        .chartYAxis {
            AxisMarks(values: .automatic) { _ in
                AxisGridLine()
                    .foregroundStyle(appState.currentTheme.borderColor.opacity(0.2))
                AxisValueLabel()
                    .foregroundStyle(appState.currentTheme.foregroundColor.opacity(0.5))
            }
        }
    }
}

enum TimeRange: String, CaseIterable {
    case lastHour = "1h"
    case last24Hours = "24h"
    case last7Days = "7d"
    case last30Days = "30d"
    
    var label: String {
        switch self {
        case .lastHour: return "Last Hour"
        case .last24Hours: return "24 Hours"
        case .last7Days: return "7 Days"
        case .last30Days: return "30 Days"
        }
    }
}

struct ActivityDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let value: Double
}

class StatsManager: ObservableObject {
    @Published var totalTokens = 2347
    @Published var tokenGrowth = 12
    @Published var avgResponseTime = 142
    @Published var responseTimeTrend = "15% faster than average"
    @Published var toolCallCount = 89
    @Published var mostUsedTool = "File Operations"
    @Published var efficiencyScore = 87
    @Published var efficiencyTrend = "Improving steadily"
    @Published var activityData: [ActivityDataPoint] = []
    
    init() {
        generateMockData()
    }
    
    private func generateMockData() {
        // Generate mock activity data
        let now = Date()
        activityData = (0..<24).map { hour in
            ActivityDataPoint(
                date: now.addingTimeInterval(Double(hour - 24) * 3600),
                value: Double.random(in: 20...80) + sin(Double(hour) * .pi / 12) * 20
            )
        }
    }
}