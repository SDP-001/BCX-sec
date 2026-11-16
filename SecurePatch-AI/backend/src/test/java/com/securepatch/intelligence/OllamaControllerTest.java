package com.securepatch.intelligence;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OllamaController.class)
@AutoConfigureMockMvc(addFilters = false)
class OllamaControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OllamaService ollamaService;

    @Test
    void exposesLocalModelStatus() throws Exception {
        when(ollamaService.status())
                .thenReturn(new OllamaStatus("DISABLED", false, false, null, "Local inference is disabled."));

        mockMvc.perform(get("/api/v1/intelligence/ollama/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("DISABLED"))
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void rejectsExplanationRequestsWithoutEvidence() throws Exception {
        mockMvc.perform(post("/api/v1/intelligence/ollama/explanations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "question": "Explain the issue.",
                                  "evidence": " ",
                                  "sourceReferences": ["caller reference"]
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(ollamaService, never()).explain(any());
    }

    @Test
    void marksGeneratedExplanationsAsUnverified() throws Exception {
        when(ollamaService.explain(any()))
                .thenReturn(new OllamaExplanationResponse(
                        "Evidence-based draft.", "local-model", "UNVERIFIED_DRAFT", List.of("caller reference")));

        mockMvc.perform(post("/api/v1/intelligence/ollama/explanations")
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
    }
}
