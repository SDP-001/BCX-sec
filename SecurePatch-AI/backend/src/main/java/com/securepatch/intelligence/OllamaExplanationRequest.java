package com.securepatch.intelligence;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record OllamaExplanationRequest(
        @NotBlank @Size(max = 1000) String question,
        @NotBlank @Size(max = 8000) String evidence,
        @NotEmpty @Size(max = 10) List<@NotBlank @Size(max = 200) String> sourceReferences) {
}
