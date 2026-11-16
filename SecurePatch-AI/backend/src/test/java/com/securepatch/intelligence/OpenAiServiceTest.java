package com.securepatch.intelligence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class OpenAiServiceTest {
    private static final String TEST_API_KEY = "server-side-test-key";

    @Test
    void reportsMissingKeyWithoutContactingOpenAi() {
        OpenAiService service = new OpenAiService(properties(""));

        assertThat(service.status().state()).isEqualTo("API_KEY_NOT_CONFIGURED");
        assertThat(service.status().available()).isFalse();
    }

    @Test
    void checksModelAvailabilityWithBackendKey() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAiService service = new OpenAiService(properties(TEST_API_KEY), builder.build());
        server.expect(requestTo("https://api.openai.com/v1/models"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + TEST_API_KEY))
                .andRespond(withSuccess("""
                        {"data":[{"id":"gpt-4o-mini"}]}
                        """, MediaType.APPLICATION_JSON));

        IntelligenceStatus status = service.status();

        assertThat(status.provider()).isEqualTo("OPENAI");
        assertThat(status.state()).isEqualTo("READY");
        assertThat(status.available()).isTrue();
        server.verify();
    }

    @Test
    void reportsRejectedKeysWithoutExposingTheKey() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAiService service = new OpenAiService(properties(TEST_API_KEY), builder.build());
        server.expect(requestTo("https://api.openai.com/v1/models"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + TEST_API_KEY))
                .andRespond(withUnauthorizedRequest());

        IntelligenceStatus status = service.status();

        assertThat(status.state()).isEqualTo("UNAVAILABLE");
        assertThat(status.detail()).contains("HTTP 401");
        assertThat(status.detail()).doesNotContain(TEST_API_KEY);
        server.verify();
    }

    @Test
    void sendsExplanationToOpenAiAndMarksItUnverified() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.openai.com/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAiService service = new OpenAiService(properties(TEST_API_KEY), builder.build());
        server.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + TEST_API_KEY))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"role":"assistant","content":"Evidence-based draft."}}]}
                        """, MediaType.APPLICATION_JSON));

        IntelligenceExplanationResponse response = service.explain(new IntelligenceExplanationRequest(
                "Summarize the risk.", "Caller-provided evidence.", List.of("NVD record")));

        assertThat(response.answer()).isEqualTo("Evidence-based draft.");
        assertThat(response.model()).isEqualTo("gpt-4o-mini");
        assertThat(response.verificationStatus()).isEqualTo("UNVERIFIED_DRAFT");
        assertThat(response.sourceReferences()).containsExactly("NVD record");
        server.verify();
    }

    @Test
    void refusesExplanationWhenKeyIsMissing() {
        OpenAiService service = new OpenAiService(properties(""));

        assertThatThrownBy(() -> service.explain(new IntelligenceExplanationRequest(
                "Question", "Evidence", List.of("Reference"))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not configured on the backend");
    }

    private static OpenAiProperties properties(String apiKey) {
        OpenAiProperties properties = new OpenAiProperties();
        properties.setApiKey(apiKey);
        return properties;
    }
}
