package com.securepatch.diagnostics;

import java.util.List;

public record DiagnosticResponse(String targetType, String summary, Integer score, String status, List<DiagnosticFinding> findings) {
}
