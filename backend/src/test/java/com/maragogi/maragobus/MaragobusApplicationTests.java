package com.maragogi.maragobus;

import com.maragogi.maragobus.integration.PostgresTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(PostgresTestConfiguration.class)
class MaragobusApplicationTests {

	@Test
	void contextLoads() {
	}

}
