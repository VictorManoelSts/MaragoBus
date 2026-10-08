package com.maragogi.maragobus.validation;

import com.maragogi.maragobus.dto.usuario.CadastroAlunoRequest;
import com.maragogi.maragobus.dto.usuario.CadastroUsuarioRequest;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class CadastroAlunoRequestTest {
    private static final UUID ID = UUID.randomUUID();

    private static CadastroUsuarioRequest pessoal(String nome, String cpf, String telefone,
                                                  String endereco, String email, String senha) {
        return new CadastroUsuarioRequest(nome, cpf, telefone, endereco, null, email, senha);
    }

    private static CadastroUsuarioRequest pessoalValido() {
        return pessoal("Aluno", "52998224725", "82999999999", "Rua Teste", "aluno@exemplo.com", "Senha123!");
    }

    static Stream<CadastroAlunoRequest> invalidos() {
        var pessoal = pessoalValido();
        return Stream.of(
                new CadastroAlunoRequest(null, ID, 1, ID),
                new CadastroAlunoRequest(pessoal, null, 1, ID),
                new CadastroAlunoRequest(pessoal, ID, 1, null),
                new CadastroAlunoRequest(pessoal, ID, null, ID),
                new CadastroAlunoRequest(pessoal, ID, 0, ID),
                new CadastroAlunoRequest(pessoal, ID, -1, ID),
                new CadastroAlunoRequest(pessoal("", "52998224725", "82999999999", "Rua", "aluno@exemplo.com", "Senha123!"), ID, 1, ID),
                new CadastroAlunoRequest(pessoal("Aluno", "123", "82999999999", "Rua", "aluno@exemplo.com", "Senha123!"), ID, 1, ID),
                new CadastroAlunoRequest(pessoal("Aluno", "52998224725", "123", "Rua", "aluno@exemplo.com", "Senha123!"), ID, 1, ID),
                new CadastroAlunoRequest(pessoal("Aluno", "52998224725", "82999999999", "", "aluno@exemplo.com", "Senha123!"), ID, 1, ID),
                new CadastroAlunoRequest(pessoal("Aluno", "52998224725", "82999999999", "Rua", "invalido", "Senha123!"), ID, 1, ID),
                new CadastroAlunoRequest(pessoal("Aluno", "52998224725", "82999999999", "Rua", "aluno@exemplo.com", "é".repeat(37)), ID, 1, ID)
        );
    }

    @ParameterizedTest(name = "Dados inválidos: {index}")
    @MethodSource("invalidos")
    void deveValidarCamposAcademicosEDadosPessoaisPorCascata(CadastroAlunoRequest dados) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertFalse(factory.getValidator().validate(dados).isEmpty());
        }
    }

    @Test
    void deveAceitarDadosValidosSemLimiteMaximoDeSemestre() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(
                    new CadastroAlunoRequest(pessoalValido(), ID, Integer.MAX_VALUE, ID)).isEmpty());
        }
    }
}
