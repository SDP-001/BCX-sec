package com.securepatch.intelligence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class OllamaServiceTest {
    @Test
    void disabledStatusDoesNotContactOllama() {
        OllamaService service = new OllamaService(properties(false, "local-model"), RestClient.builder().build());

        assertThat(service.status().state()).isEqualTo("DISABLED");
    }

    @Test
    void rejectsNonLocalOllamaAddresses() {
        OllamaProperties properties = properties(true, "local-model");
        properties.setBaseUrl("http://example.test:11434");

        assertThatIllegalArgumentException()
                .isThrownBy(() -> new OllamaService(properties))
                .withMessage("Ollama must use an allowed local HTTP endpoint.");
    }

    @Test
    void returnsGroundedDraftAndMarksItUnverified() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:11434");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OllamaService service = new OllamaService(properties(true, "local-model"), builder.build());
        server.expect(requestTo("http://localhost:11434/api/tags"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"models":[{"name":"local-model"}]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://localhost:11434/api/chat"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"message":{"role":"assistant","content":"Evidence-based draft."}}
                        """, MediaType.APPLICATION_JSON));

        OllamaExplanationResponse response = service.explain(new OllamaExplanationRequest(
                "Summarize the risk.", "Caller-provided evidence.", List.of("NVD record")));

        assertThat(response.answer()).isEqualTo("Evidence-based draft.");
        assertThat(response.verificationStatus()).isEqualTo("UNVERIFIED_DRAFT");
        assertThat(response.sourceReferences()).containsExactly("NVD record");
        server.verify();
    }

    private static OllamaProperties properties(boolean enabled, String model) {
        OllamaProperties properties = new OllamaProperties();
        properties.setEnabled(enabled);
        properties.setModel(model);
        return properties;
    }
}
