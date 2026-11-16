package com.securepatch.intelligence;

import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class IntelligenceService {
    private final String provider;
    private final OllamaService ollamaService;
    private final OpenAiService openAiService;

    public IntelligenceService(
            OllamaService ollamaService,
            OpenAiService openAiService,
            @Value("${bytecodx.ai.provider:ollama}") String provider) {
        this.provider = provider.toLowerCase(Locale.ROOT);
        if (!this.provider.equals("ollama") && !this.provider.equals("openai")) {
            throw new IllegalArgumentException("AI_PROVIDER must be either ollama or openai.");
        }
        this.ollamaService = ollamaService;
        this.openAiService = openAiService;
    }

    public IntelligenceStatus status() {
        if (provider.equals("openai")) {
            return openAiService.status();
        }
        OllamaStatus status = ollamaService.status();
        return new IntelligenceStatus(
                "OLLAMA", status.state(), status.enabled(), status.available(), status.model(), status.detail());
    }

    public IntelligenceExplanationResponse explain(IntelligenceExplanationRequest request) {
        if (provider.equals("openai")) {
            return openAiService.explain(request);
        }
        OllamaExplanationResponse response = ollamaService.explain(request);
        return new IntelligenceExplanationResponse(
                response.answer(),
                response.model(),
                response.verificationStatus(),
                response.sourceReferences());
    }
}
