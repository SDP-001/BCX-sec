package com.securepatch.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("demo")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:bytecodx-demo-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "bytecodx.demo-account.enabled=true",
        "bytecodx.demo-account.email=demo@bytecodx.local",
        "bytecodx.demo-account.password=BytecodxDemo2026!"
})
class DemoProfileStartupTest {
    @Autowired
    private UserAccountRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void migratesDemoDatabaseAndSeedsViewerAccount() {
        UserAccount account = users.findByEmail("demo@bytecodx.local").orElseThrow();

        assertThat(account.getDisplayName()).isEqualTo("Bytecodx Demo");
        assertThat(passwordEncoder.matches("BytecodxDemo2026!", account.getPassword())).isTrue();
        assertThat(account.getAuthorities()).extracting("authority").containsExactly("ROLE_VIEWER");
    }
}
