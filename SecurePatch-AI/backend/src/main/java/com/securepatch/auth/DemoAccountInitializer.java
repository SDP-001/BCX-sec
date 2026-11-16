package com.securepatch.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConditionalOnProperty(prefix = "bytecodx.demo-account", name = "enabled", havingValue = "true")
public class DemoAccountInitializer implements ApplicationRunner {
    private static final Logger LOGGER = LoggerFactory.getLogger(DemoAccountInitializer.class);

    private final UserAccountRepository users;
    private final AuthService authService;
    private final String email;
    private final String password;

    public DemoAccountInitializer(
            UserAccountRepository users,
            AuthService authService,
            @Value("${bytecodx.demo-account.email:}") String email,
            @Value("${bytecodx.demo-account.password:}") String password) {
        this.users = users;
        this.authService = authService;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(email)
                || !StringUtils.hasText(password)
                || password.length() < 12
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException(
                    "A demo account requires an email and a password between 12 and 72 UTF-8 bytes.");
        }
        if (users.existsByEmail(email)) {
            LOGGER.info("Configured demo viewer account already exists: {}", email);
            return;
        }
        authService.register(email, "Bytecodx Demo", password);
        LOGGER.info("Created local demo viewer account: {}", email);
    }
}
