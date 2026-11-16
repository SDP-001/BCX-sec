package com.securepatch.intelligence;

import java.util.List;

public record OllamaExplanationResponse(
        String answer,
        String model,
        String verificationStatus,
        List<String> sourceReferences) {
}
