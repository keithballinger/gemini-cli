import SwiftUI

struct Theme {
    let name: String
    let backgroundColor: Color
    let foregroundColor: Color
    let accentColor: Color
    let borderColor: Color
    let shadowColor: Color
    let codeHighlightColor: Color
    
    static let cyberpunk = Theme(
        name: "Cyberpunk",
        backgroundColor: Color(red: 0.05, green: 0.05, blue: 0.1),
        foregroundColor: Color(red: 0.0, green: 1.0, blue: 0.8),
        accentColor: Color(red: 1.0, green: 0.0, blue: 0.5),
        borderColor: Color(red: 0.0, green: 0.8, blue: 0.8).opacity(0.5),
        shadowColor: Color(red: 0.0, green: 1.0, blue: 1.0).opacity(0.3),
        codeHighlightColor: Color(red: 1.0, green: 0.4, blue: 0.0)
    )
    
    static let terminal = Theme(
        name: "Terminal",
        backgroundColor: Color.black,
        foregroundColor: Color(red: 0.0, green: 1.0, blue: 0.0),
        accentColor: Color(red: 0.0, green: 0.8, blue: 0.0),
        borderColor: Color(red: 0.0, green: 0.6, blue: 0.0),
        shadowColor: Color(red: 0.0, green: 1.0, blue: 0.0).opacity(0.2),
        codeHighlightColor: Color(red: 0.5, green: 1.0, blue: 0.0)
    )
    
    static let synthwave = Theme(
        name: "Synthwave",
        backgroundColor: Color(red: 0.1, green: 0.0, blue: 0.2),
        foregroundColor: Color(red: 1.0, green: 0.0, blue: 1.0),
        accentColor: Color(red: 0.0, green: 1.0, blue: 1.0),
        borderColor: Color(red: 1.0, green: 0.0, blue: 0.5),
        shadowColor: Color(red: 1.0, green: 0.0, blue: 1.0).opacity(0.4),
        codeHighlightColor: Color(red: 0.0, green: 1.0, blue: 1.0)
    )
}