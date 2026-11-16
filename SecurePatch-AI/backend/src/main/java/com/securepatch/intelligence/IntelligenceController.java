package com.securepatch.intelligence;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/intelligence")
public class IntelligenceController {
    private final IntelligenceService intelligenceService;

    public IntelligenceController(IntelligenceService intelligenceService) {
        this.intelligenceService = intelligenceService;
    }

    @GetMapping("/status")
    public IntelligenceStatus status() {
        return intelligenceService.status();
    }

    @PostMapping("/explanations")
    public IntelligenceExplanationResponse explain(@Valid @RequestBody IntelligenceExplanationRequest request) {
        return intelligenceService.explain(request);
    }
}
