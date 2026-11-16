package com.securepatch.diagnostics;

public record DiagnosticFinding(String severity, String title, String message, String fix) {
}
