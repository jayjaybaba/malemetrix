import UIKit
import Capacitor

/// Die Bruecke der App — mit dem einen Plugin, das Capacitor nicht von selbst
/// findet.
///
/// WARUM ES DIESE DATEI GIBT
/// Capacitor registriert auf iOS nur, was in `packageClassList` steht
/// (CapacitorBridge.registerPlugins liest ausschliesslich diese Liste). Dort
/// stehen die sieben Plugins aus node_modules — `HealthPlugin` gehoert uns und
/// steht nicht darin. Ergebnis: das Entitlement `com.apple.developer.healthkit`
/// und beide `NSHealth*UsageDescription` lagen im Binary, aber
/// `Capacitor.Plugins.Health` gab es nie. Die Oberflaeche sagte dann ehrlich
/// „Diese App-Version hat die Apple-Health-Anbindung nicht" — und genau das war
/// der Grund, ueberhaupt eine native App zu bauen.
///
/// WARUM NICHT EINFACH IN DIE LISTE EINTRAGEN
/// `npx cap sync ios` schreibt `packageClassList` bei jedem Lauf neu
/// (@capacitor/cli, writePluginJSON). Ein Eintrag dort haelt bis zum naechsten
/// Build. `registerPluginInstance` haengt dagegen an unserem Code und laeuft in
/// `capacitorDidLoad`, also bevor die Seite geladen wird.
class MMBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
