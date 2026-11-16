package com.securepatch.intelligence;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(IntelligenceController.class)
@AutoConfigureMockMvc(addFilters = false)
class IntelligenceControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IntelligenceService intelligenceService;

    @Test
    void exposesConfiguredProviderStatusWithoutReturningCredentials() throws Exception {
        when(intelligenceService.status())
                .thenReturn(new IntelligenceStatus(
                        "OPENAI", "READY", true, true, "gpt-4o-mini", "OpenAI API key and model are available."));

        mockMvc.perform(get("/api/v1/intelligence/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("OPENAI"))
                .andExpect(jsonPath("$.state").value("READY"))
                .andExpect(jsonPath("$.apiKey").doesNotExist());
    }

    @Test
    void sendsValidatedExplanationRequestsToConfiguredProvider() throws Exception {
        when(intelligenceService.explain(any()))
                .thenReturn(new IntelligenceExplanationResponse(
                        "Evidence-based draft.", "gpt-4o-mini", "UNVERIFIED_DRAFT", List.of("caller reference")));

        mockMvc.perform(post("/api/v1/intelligence/explanations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "Explain the issue.",
                                  "evidence": "Caller-provided evidence.",
                                  "sourceReferences": ["caller reference"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("UNVERIFIED_DRAFT"))
                .andExpect(jsonPath("$.sourceReferences[0]").value("caller reference"));

        verify(intelligenceService).explain(any());
    }
}
