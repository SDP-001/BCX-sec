package com.securepatch.intelligence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.Test;

class IntelligenceServiceTest {
    private final OllamaService ollamaService = mock(OllamaService.class);
    private final OpenAiService openAiService = mock(OpenAiService.class);

    @Test
    void routesOpenAiProviderRequestsWithoutCallingOllama() {
        IntelligenceService service = new IntelligenceService(ollamaService, openAiService, "OpenAI");
        IntelligenceExplanationRequest request = new IntelligenceExplanationRequest(
                "Summarize the risk.", "Caller-provided evidence.", List.of("NVD record"));
        IntelligenceExplanationResponse expected = new IntelligenceExplanationResponse(
                "Evidence-based draft.", "gpt-4o-mini", "UNVERIFIED_DRAFT", List.of("NVD record"));
        when(openAiService.explain(request)).thenReturn(expected);

        assertThat(service.explain(request)).isEqualTo(expected);

        verify(openAiService).explain(request);
        verify(ollamaService, never()).explain(request);
    }

    @Test
    void rejectsUnknownProviders() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new IntelligenceService(ollamaService, openAiService, "unknown"))
                .withMessage("AI_PROVIDER must be either ollama or openai.");
    }
}
