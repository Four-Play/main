// Force-link the Capacitor plugins we depend on. Adding them as SPM
// package dependencies is not enough — Swift's linker drops unused
// modules, and without an `import` here the camera plugin never makes
// it into the binary (which Capacitor reports at runtime as
// "Camera plugin is not implemented on iOS").
import CapacitorCamera

public let isCapacitorApp = true
