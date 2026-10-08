package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.usuario.*;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.repository.UsuarioRepository;
import com.maragogi.maragobus.repository.CursoOfertadoRepository;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
import com.maragogi.maragobus.repository.PerfilAlunoRepository;
import com.maragogi.maragobus.entity.Curso;
import com.maragogi.maragobus.entity.Faculdade;
import com.maragogi.maragobus.entity.CursoOfertado;
import com.maragogi.maragobus.entity.PontoEmbarque;
import com.maragogi.maragobus.validation.ValidadorCpf;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.Arguments;
import com.maragogi.maragobus.config.PasswordConfig;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @ParameterizedTest
    @EnumSource(value = TipoUsuario.class, names = {"MOTORISTA", "ADMIN"})
    void deveCadastrarAdministrativamenteComPapelPermitido(TipoUsuario tipo) {
        var dados = new CadastroUsuarioRequest(" Nome Teste ", "52998224725", "82999999999",
                " Rua Teste ", "foto", "  USUARIO@EXEMPLO.COM  ", "Senha123!");
        when(passwordEncoder.encode(dados.senha())).thenReturn("hash-da-senha");
        var id = UUID.randomUUID();
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacao -> {
            Usuario usuario = invocacao.getArgument(0);
            usuario.setId(id);
            return usuario;
        });

        var resposta = usuarioService.cadastrarAdministrativo(dados, tipo);

        assertAll(
                () -> assertEquals(id, resposta.id()),
                () -> assertEquals(tipo, resposta.tipoUsuario()),
                () -> assertEquals("Nome Teste", resposta.nome()),
                () -> assertEquals("usuario@exemplo.com", resposta.email()),
                () -> assertTrue(resposta.ativo())
        );
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        var usuario = captor.getValue();
        assertAll(
                () -> assertEquals(tipo, usuario.getTipoUsuario()),
                () -> assertEquals("hash-da-senha", usuario.getSenha()),
                () -> assertEquals(dados.cpf(), usuario.getCpf()),
                () -> assertEquals(dados.telefone(), usuario.getTelefone()),
                () -> assertEquals("Rua Teste", usuario.getEndereco()),
                () -> assertEquals("foto", usuario.getFoto()),
                () -> assertTrue(usuario.isAtivo())
        );
        verify(usuarioRepository).existsByEmail("usuario@exemplo.com");
        verify(usuarioRepository).existsByCpf(dados.cpf());
        verifyNoMoreInteractions(usuarioRepository);
        verify(passwordEncoder).encode(dados.senha());
        verifyNoMoreInteractions(passwordEncoder);
        verifyNoInteractions(perfilAlunoRepository, cursoOfertadoRepository, pontoEmbarqueRepository);
    }

    static Stream<TipoUsuario> papeisAdministrativosInvalidos() {
        return Stream.of(TipoUsuario.ALUNO, null);
    }

    @ParameterizedTest
    @MethodSource("papeisAdministrativosInvalidos")
    void naoDeveCadastrarAdministrativamenteComPapelNaoPermitido(TipoUsuario tipo) {
        var dados = new CadastroUsuarioRequest("Nome", "52998224725", "82999999999",
                "Rua Teste", null, "usuario@exemplo.com", "Senha123!");

        var excecao = assertThrows(RegraNegocioException.class,
                () -> usuarioService.cadastrarAdministrativo(dados, tipo));

        assertEquals("O cadastro administrativo permite apenas MOTORISTA ou ADMIN.", excecao.getMessage());
        verifyNoInteractions(usuarioRepository, passwordEncoder);
    }

    static Stream<Arguments> regrasInvalidasNoCadastroAdministrativo() {
        return Stream.of(TipoUsuario.MOTORISTA, TipoUsuario.ADMIN).flatMap(tipo -> Stream.of(
                Arguments.of(tipo, "11111111111", false, false, "O CPF informado é inválido."),
                Arguments.of(tipo, "52998224725", true, false, "Já existe um usuário com este e-mail."),
                Arguments.of(tipo, "52998224725", false, true, "Já existe um usuário com este CPF.")
        ));
    }

    @ParameterizedTest
    @MethodSource("regrasInvalidasNoCadastroAdministrativo")
    void devePreservarValidacoesDeCpfEEmailNoCadastroAdministrativo(
            TipoUsuario tipo, String cpf, boolean emailDuplicado, boolean cpfDuplicado, String mensagem
    ) {
        var dados = new CadastroUsuarioRequest("Nome", cpf, "82999999999",
                "Rua Teste", null, "usuario@exemplo.com", "Senha123!");
        if (emailDuplicado) {
            when(usuarioRepository.existsByEmail(dados.email())).thenReturn(true);
        }
        if (cpfDuplicado) {
            when(usuarioRepository.existsByCpf(cpf)).thenReturn(true);
        }

        var excecao = assertThrows(RegraNegocioException.class,
                () -> usuarioService.cadastrarAdministrativo(dados, tipo));

        assertEquals(mensagem, excecao.getMessage());
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    @ParameterizedTest
    @MethodSource("senhasInvalidas")
    void naoDeveCadastrarAdministrativamenteComSenhaInvalida(String senha) {
        var dados = new CadastroUsuarioRequest("Nome", "52998224725", "82999999999",
                "Rua Teste", null, "usuario@exemplo.com", senha);
        for (var tipo : new TipoUsuario[]{TipoUsuario.MOTORISTA, TipoUsuario.ADMIN}) {
            var excecao = assertThrows(RegraNegocioException.class,
                    () -> usuarioService.cadastrarAdministrativo(dados, tipo));
            assertEquals(com.maragogi.maragobus.validation.ValidadorSenha.MENSAGEM, excecao.getMessage());
        }
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    static Stream<String> senhasInvalidas() {
        return Stream.of(null, "", "        ", "1234567", "a".repeat(73),
                "é".repeat(37), "a".repeat(71) + "é", "😀".repeat(19));
    }

    @ParameterizedTest
    @MethodSource("senhasInvalidas")
    void naoDeveCadastrarComSenhaInvalida(String senha) {
        var dados = new CadastroUsuarioRequest("Aluno", "52998224725", "82999999999",
                "Rua Teste", null, "aluno@exemplo.com", senha);
        assertThrows(RegraNegocioException.class,
                () -> usuarioService.cadastrarAluno(cadastroAluno(dados)));
        verifyNoInteractions(passwordEncoder);
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(perfilAlunoRepository);
    }

    @ParameterizedTest
    @MethodSource("senhasInvalidas")
    void naoDeveAlterarParaSenhaInvalida(String senha) {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setSenha("hash-antigo");
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("SenhaAtual123!", "hash-antigo")).thenReturn(true);
        var excecao = assertThrows(RegraNegocioException.class,
                () -> usuarioService.alterarSenha(id, new AlteracaoSenhaRequest("SenhaAtual123!", senha)));
        assertEquals(com.maragogi.maragobus.validation.ValidadorSenha.MENSAGEM, excecao.getMessage());
        assertEquals("hash-antigo", usuario.getSenha());
        verify(passwordEncoder).matches("SenhaAtual123!", "hash-antigo");
        verify(passwordEncoder, never()).encode(any());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void naoDeveAlterarParaSenhaIgualAtual() {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setSenha("hash-antigo");
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("SenhaAtual123!", "hash-antigo")).thenReturn(true);
        var excecao = assertThrows(RegraNegocioException.class,
                () -> usuarioService.alterarSenha(id,
                        new AlteracaoSenhaRequest("SenhaAtual123!", "SenhaAtual123!")));
        assertEquals("A nova senha deve ser diferente da senha atual.", excecao.getMessage());
        assertEquals("hash-antigo", usuario.getSenha());
        verify(passwordEncoder, times(2)).matches("SenhaAtual123!", "hash-antigo");
        verifyNoMoreInteractions(passwordEncoder);
        verify(usuarioRepository).findById(id);
        verifyNoMoreInteractions(usuarioRepository);
    }

    @Test
    void naoDeveCadastrarUsuarioComCpfDuplicado() {
        var dados = new CadastroUsuarioRequest("Aluno", "52998224725", "82999999999",
                "Rua Teste", null, "aluno@exemplo.com", "Senha123!");
        when(usuarioRepository.existsByCpf(dados.cpf())).thenReturn(true);

        var excecao = assertThrows(RegraNegocioException.class,
                () -> usuarioService.cadastrarAluno(cadastroAluno(dados)));

        assertEquals("Já existe um usuário com este CPF.", excecao.getMessage());
        verify(usuarioRepository).existsByEmail(dados.email());
        verify(usuarioRepository).existsByCpf(dados.cpf());
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
        verifyNoInteractions(perfilAlunoRepository);
    }

    @Test
    void naoDeveBuscarUsuarioInexistentePorId() {
        var id = UUID.randomUUID();
        when(usuarioRepository.findById(id)).thenReturn(Optional.empty());

        var excecao = assertThrows(RecursoNaoEncontradoException.class,
                () -> usuarioService.buscarPorId(id));

        assertEquals("Usuário não encontrado.", excecao.getMessage());
        verify(usuarioRepository).findById(id);
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void naoDeveBuscarUsuarioInexistentePorEmail() {
        String email = "inexistente@exemplo.com";
        when(usuarioRepository.findByEmail(email)).thenReturn(Optional.empty());

        var excecao = assertThrows(RecursoNaoEncontradoException.class,
                () -> usuarioService.buscarPorEmail(email));

        assertEquals("Usuário não encontrado.", excecao.getMessage());
        verify(usuarioRepository).findByEmail(email);
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @ParameterizedTest
    @ValueSource(strings = {"atual@exemplo.com", "ATUAL@EXEMPLO.COM", "  atual@exemplo.com  "})
    void deveAtualizarMantendoEmailAtualSemConsultarDuplicidade(String email) {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setId(id);
        usuario.setEmail("atual@exemplo.com");
        usuario.setSenha("hash-atual");
        usuario.setCpf("52998224725");
        usuario.setTipoUsuario(TipoUsuario.ALUNO);
        usuario.setAtivo(true);
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));
        var dados = new AtualizacaoUsuarioRequest(" Nome Atualizado ", "82988888888",
                " Rua Nova ", "foto-nova", email);

        var resposta = usuarioService.atualizarDados(id, dados);

        assertAll(
                () -> assertEquals(id, resposta.id()),
                () -> assertEquals("atual@exemplo.com", resposta.email()),
                () -> assertEquals("Nome Atualizado", resposta.nome()),
                () -> assertEquals("82988888888", resposta.telefone()),
                () -> assertEquals("Rua Nova", usuario.getEndereco()),
                () -> assertEquals("foto-nova", usuario.getFoto()),
                () -> assertEquals("hash-atual", usuario.getSenha()),
                () -> assertEquals("52998224725", usuario.getCpf()),
                () -> assertEquals(TipoUsuario.ALUNO, resposta.tipoUsuario()),
                () -> assertTrue(resposta.ativo())
        );
        verify(usuarioRepository).findById(id);
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void naoDeveAtualizarComEmailPertencenteAOutroUsuario() {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setId(id);
        usuario.setNome("Nome Antigo");
        usuario.setEmail("atual@exemplo.com");
        usuario.setTelefone("82999999999");
        usuario.setEndereco("Rua Antiga");
        usuario.setFoto("foto-antiga");
        usuario.setCpf("52998224725");
        usuario.setSenha("hash-atual");
        usuario.setTipoUsuario(TipoUsuario.ALUNO);
        usuario.setAtivo(true);
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.existsByEmail("outro@exemplo.com")).thenReturn(true);
        var dados = new AtualizacaoUsuarioRequest("Nome Novo", "82988888888",
                "Rua Nova", "foto-nova", "  OUTRO@EXEMPLO.COM  ");

        var excecao = assertThrows(RegraNegocioException.class,
                () -> usuarioService.atualizarDados(id, dados));

        assertAll(
                () -> assertEquals("Já existe um usuário com este e-mail.", excecao.getMessage()),
                () -> assertEquals(id, usuario.getId()),
                () -> assertEquals("Nome Antigo", usuario.getNome()),
                () -> assertEquals("atual@exemplo.com", usuario.getEmail()),
                () -> assertEquals("82999999999", usuario.getTelefone()),
                () -> assertEquals("Rua Antiga", usuario.getEndereco()),
                () -> assertEquals("foto-antiga", usuario.getFoto()),
                () -> assertEquals("52998224725", usuario.getCpf()),
                () -> assertEquals("hash-atual", usuario.getSenha()),
                () -> assertEquals(TipoUsuario.ALUNO, usuario.getTipoUsuario()),
                () -> assertTrue(usuario.isAtivo())
        );
        verify(usuarioRepository).findById(id);
        verify(usuarioRepository).existsByEmail("outro@exemplo.com");
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void deveDesativarUsuario() {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setId(id);
        usuario.setAtivo(true);
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));

        usuarioService.desativar(id);

        assertFalse(usuario.isAtivo());
        assertEquals(id, usuario.getId());
        verify(usuarioRepository).findById(id);
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void deveReativarUsuario() {
        var id = UUID.randomUUID();
        var usuario = new Usuario();
        usuario.setId(id);
        usuario.setAtivo(false);
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));

        usuarioService.reativar(id);

        assertTrue(usuario.isAtivo());
        assertEquals(id, usuario.getId());
        verify(usuarioRepository).findById(id);
        verifyNoMoreInteractions(usuarioRepository);
        verifyNoInteractions(passwordEncoder);
    }

    static Stream<String> senhasNoLimite() {
        return Stream.of("a".repeat(72), "é".repeat(36), "😀".repeat(18));
    }

    @ParameterizedTest
    @MethodSource("senhasNoLimite")
    void deveCadastrarEAlterarComBCryptRealNoLimiteDeBytes(String senha) {
        var encoder = new PasswordConfig().passwordEncoder();
        var service = new UsuarioService(usuarioRepository, encoder, cursoOfertadoRepository,
                pontoEmbarqueRepository, perfilAlunoRepository);
        configurarDadosAcademicos();
        var id = UUID.randomUUID();
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocacao -> {
            Usuario usuario = invocacao.getArgument(0);
            usuario.setId(id);
            return usuario;
        });
        service.cadastrarAluno(cadastroAluno(new CadastroUsuarioRequest("Aluno", "52998224725", "82999999999",
                "Rua Teste", null, "aluno@exemplo.com", senha)));
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        var usuario = captor.getValue();
        var hashAnterior = usuario.getSenha();
        assertNotEquals(senha, hashAnterior);
        assertTrue(encoder.matches(senha, hashAnterior));
        when(usuarioRepository.findById(id)).thenReturn(Optional.of(usuario));
        assertThrows(RegraNegocioException.class,
                () -> service.alterarSenha(id, new AlteracaoSenhaRequest(senha, senha)));
        assertEquals(hashAnterior, usuario.getSenha());
        String novaSenha = "SenhaNova123!";
        service.alterarSenha(id, new AlteracaoSenhaRequest(senha, novaSenha));
        assertNotEquals(novaSenha, usuario.getSenha());
        assertNotEquals(hashAnterior, usuario.getSenha());
        assertTrue(encoder.matches(novaSenha, usuario.getSenha()));
        service.alterarSenha(id, new AlteracaoSenhaRequest(novaSenha, senha));
        assertNotEquals(senha, usuario.getSenha());
        assertTrue(encoder.matches(senha, usuario.getSenha()));
    }

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private CursoOfertadoRepository cursoOfertadoRepository;

    @Mock
    private PontoEmbarqueRepository pontoEmbarqueRepository;

    @Mock
    private PerfilAlunoRepository perfilAlunoRepository;

    private static final UUID CURSO_OFERTADO_ID = UUID.randomUUID();
    private static final UUID PONTO_EMBARQUE_ID = UUID.randomUUID();

    private CadastroAlunoRequest cadastroAluno(CadastroUsuarioRequest dados) {
        return new CadastroAlunoRequest(dados, CURSO_OFERTADO_ID, 1, PONTO_EMBARQUE_ID);
    }

    private void configurarDadosAcademicos() {
        var cursoOfertado = CursoOfertado.builder().id(CURSO_OFERTADO_ID)
                .curso(new Curso()).faculdade(new Faculdade()).build();
        var ponto = PontoEmbarque.builder().id(PONTO_EMBARQUE_ID).build();
        when(cursoOfertadoRepository.findById(CURSO_OFERTADO_ID)).thenReturn(Optional.of(cursoOfertado));
        when(pontoEmbarqueRepository.findById(PONTO_EMBARQUE_ID)).thenReturn(Optional.of(ponto));
    }

    @InjectMocks
    private UsuarioService usuarioService;

    @Test
    void deveCadastrarUsuarioComSucesso() {

        configurarDadosAcademicos();

        CadastroUsuarioRequest dados = new CadastroUsuarioRequest(
                "Aluno Teste",
                "52998224725",
                "82999999999",
                "Rua Teste",
                null,
                "aluno@exemplo.com",
                "Senha123!"
        );

        when(usuarioRepository.existsByEmail(anyString()))
                .thenReturn(false);

        when(usuarioRepository.existsByCpf(anyString()))
                .thenReturn(false);

        when(passwordEncoder.encode("Senha123!"))
                .thenReturn("hash-da-senha");

        when(usuarioRepository.save(any(Usuario.class)))
                .thenAnswer(invocacao -> {
                    Usuario usuario = invocacao.getArgument(0);
                    usuario.setId(UUID.randomUUID());
                    return usuario;
                });

        UsuarioResponse resposta = usuarioService.cadastrarAluno(
                cadastroAluno(dados)
        );

        assertNotNull(resposta.id());
        assertEquals("Aluno Teste", resposta.nome());
        assertEquals("aluno@exemplo.com", resposta.email());
        assertEquals(TipoUsuario.ALUNO, resposta.tipoUsuario());
        assertTrue(resposta.ativo());

        verify(passwordEncoder).encode("Senha123!");
        verify(usuarioRepository).save(argThat(usuario ->
                usuario.getSenha().equals("hash-da-senha")
        ));
    }

    @Test
    void naoDeveCadastrarUsuarioComEmailDuplicado() {

        CadastroUsuarioRequest dados = new CadastroUsuarioRequest(
                "Aluno Teste",
                "52998224725",
                "82999999999",
                "Rua Teste",
                null,
                "aluno@exemplo.com",
                "Senha123!"
        );

        when(usuarioRepository.existsByEmail("aluno@exemplo.com"))
                .thenReturn(true);

        RegraNegocioException excecao = assertThrows(
                RegraNegocioException.class,
                () -> usuarioService.cadastrarAluno(
                        cadastroAluno(dados)
                )
        );

        assertEquals(
                "Já existe um usuário com este e-mail.",
                excecao.getMessage()
        );

        verify(usuarioRepository, never())
                .save(any(Usuario.class));
        verifyNoInteractions(perfilAlunoRepository);
    }

    @Test
    void naoDeveCadastrarUsuarioComCpfInvalido() {

        CadastroUsuarioRequest dados = new CadastroUsuarioRequest(
                "Aluno Teste",
                "11111111111",
                "82999999999",
                "Rua Teste",
                null,
                "aluno@exemplo.com",
                "Senha123!"
        );

        assertThrows(
                RegraNegocioException.class,
                () -> usuarioService.cadastrarAluno(
                        cadastroAluno(dados)
                )
        );

        verify(usuarioRepository, never())
                .save(any(Usuario.class));
        verifyNoInteractions(perfilAlunoRepository);
    }

    @Test
    void deveAtualizarDadosDoUsuario() {

        UUID id = UUID.randomUUID();

        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setNome("Nome Antigo");
        usuario.setEmail("antigo@exemplo.com");
        usuario.setTelefone("82999999999");
        usuario.setEndereco("Rua Antiga");
        usuario.setTipoUsuario(TipoUsuario.ALUNO);
        usuario.setAtivo(true);

        AtualizacaoUsuarioRequest dados =
                new AtualizacaoUsuarioRequest(
                        "Nome Atualizado",
                        "82988888888",
                        "Rua Nova",
                        null,
                        "novo@exemplo.com"
                );

        when(usuarioRepository.findById(id))
                .thenReturn(Optional.of(usuario));

        when(usuarioRepository.existsByEmail("novo@exemplo.com"))
                .thenReturn(false);

        UsuarioResponse resposta =
                usuarioService.atualizarDados(id, dados);

        assertEquals("Nome Atualizado", resposta.nome());
        assertEquals("novo@exemplo.com", resposta.email());
        assertEquals("82988888888", resposta.telefone());

        assertEquals("Rua Nova", usuario.getEndereco());

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void naoDeveAlterarSenhaQuandoSenhaAtualEstiverIncorreta() {

        UUID id = UUID.randomUUID();

        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setSenha("hash-antigo");

        when(usuarioRepository.findById(id))
                .thenReturn(Optional.of(usuario));

        when(passwordEncoder.matches(
                "senhaErrada",
                "hash-antigo"
        )).thenReturn(false);

        AlteracaoSenhaRequest dados =
                new AlteracaoSenhaRequest(
                        "senhaErrada",
                        "NovaSenha123!"
                );

        assertThrows(
                RegraNegocioException.class,
                () -> usuarioService.alterarSenha(id, dados)
        );

        assertEquals("hash-antigo", usuario.getSenha());

        verify(passwordEncoder, never())
                .encode(anyString());
    }

    @Test
    void deveAlterarSenhaComSucesso() {

        UUID id = UUID.randomUUID();

        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setSenha("hash-antigo");

        when(usuarioRepository.findById(id))
                .thenReturn(Optional.of(usuario));

        when(passwordEncoder.matches(
                "SenhaAtual123!",
                "hash-antigo"
        )).thenReturn(true);

        when(passwordEncoder.encode("NovaSenha123!"))
                .thenReturn("hash-novo");

        AlteracaoSenhaRequest dados =
                new AlteracaoSenhaRequest(
                        "SenhaAtual123!",
                        "NovaSenha123!"
                );

        usuarioService.alterarSenha(id, dados);

        assertEquals("hash-novo", usuario.getSenha());

        verify(passwordEncoder)
                .encode("NovaSenha123!");
    }



}
