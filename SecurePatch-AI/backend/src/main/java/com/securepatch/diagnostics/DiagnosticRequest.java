package com.securepatch.diagnostics;

import jakarta.validation.constraints.NotBlank;

public record DiagnosticRequest(@NotBlank String targetType, @NotBlank String input) {
}
