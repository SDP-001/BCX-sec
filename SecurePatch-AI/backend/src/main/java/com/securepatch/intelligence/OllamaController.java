package com.securepatch.intelligence;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/intelligence/ollama")
public class OllamaController {
    private final OllamaService ollamaService;

    public OllamaController(OllamaService ollamaService) {
        this.ollamaService = ollamaService;
    }

    @GetMapping("/status")
    public OllamaStatus status() {
        return ollamaService.status();
    }

    @PostMapping("/explanations")
    public OllamaExplanationResponse explain(@Valid @RequestBody IntelligenceExplanationRequest request) {
        return ollamaService.explain(request);
    }
}
