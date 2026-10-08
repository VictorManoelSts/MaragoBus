package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.usuario.AlteracaoSenhaRequest;
import com.maragogi.maragobus.dto.usuario.AtualizacaoUsuarioRequest;
import com.maragogi.maragobus.dto.usuario.CadastroUsuarioRequest;
import com.maragogi.maragobus.dto.usuario.CadastroAlunoRequest;
import com.maragogi.maragobus.dto.usuario.UsuarioResponse;
import com.maragogi.maragobus.entity.Usuario;
import com.maragogi.maragobus.entity.PerfilAluno;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.UsuarioRepository;
import com.maragogi.maragobus.repository.CursoOfertadoRepository;
import com.maragogi.maragobus.repository.PontoEmbarqueRepository;
import com.maragogi.maragobus.repository.PerfilAlunoRepository;
import com.maragogi.maragobus.validation.ValidadorCpf;
import com.maragogi.maragobus.validation.ValidadorSenha;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@Validated
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final CursoOfertadoRepository cursoOfertadoRepository;
    private final PontoEmbarqueRepository pontoEmbarqueRepository;
    private final PerfilAlunoRepository perfilAlunoRepository;

    public UsuarioService(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            CursoOfertadoRepository cursoOfertadoRepository,
            PontoEmbarqueRepository pontoEmbarqueRepository,
            PerfilAlunoRepository perfilAlunoRepository
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.cursoOfertadoRepository = cursoOfertadoRepository;
        this.pontoEmbarqueRepository = pontoEmbarqueRepository;
        this.perfilAlunoRepository = perfilAlunoRepository;
    }

    @Transactional(readOnly = true)
    public Usuario buscarPorId(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() ->
                        new RecursoNaoEncontradoException(
                                "Usuário não encontrado."
                        )
                );
    }

    @Transactional
    public UsuarioResponse cadastrarAluno(@Valid @NotNull CadastroAlunoRequest dados) {
        if (dados == null || dados.dadosPessoais() == null
                || dados.cursoOfertadoId() == null || dados.pontoEmbarquePadraoId() == null) {
            throw new RegraNegocioException("Os dados pessoais, o curso ofertado e o ponto de embarque são obrigatórios.");
        }
        if (dados.semestreAtual() == null || dados.semestreAtual() <= 0) {
            throw new RegraNegocioException("O semestre atual deve ser um número positivo.");
        }

        Usuario usuario = criarUsuario(dados.dadosPessoais(), TipoUsuario.ALUNO);
        var cursoOfertado = cursoOfertadoRepository.findById(dados.cursoOfertadoId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Curso ofertado não encontrado."));
        if (!cursoOfertado.isAtivo()) {
            throw new RegraNegocioException("O curso ofertado está inativo.");
        }
        if (!cursoOfertado.getCurso().isAtivo()) {
            throw new RegraNegocioException("O curso está inativo.");
        }
        if (!cursoOfertado.getFaculdade().isAtivo()) {
            throw new RegraNegocioException("A faculdade está inativa.");
        }

        var pontoEmbarque = pontoEmbarqueRepository.findById(dados.pontoEmbarquePadraoId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Ponto de embarque não encontrado."));
        if (!pontoEmbarque.isAtivo()) {
            throw new RegraNegocioException("O ponto de embarque está inativo.");
        }

        Usuario usuarioSalvo = usuarioRepository.save(usuario);
        if (perfilAlunoRepository.existsByUsuarioId(usuarioSalvo.getId())) {
            throw new RegraNegocioException("Já existe um perfil de aluno para este usuário.");
        }
        PerfilAluno perfil = new PerfilAluno();
        perfil.setUsuario(usuarioSalvo);
        perfil.setCursoOfertado(cursoOfertado);
        perfil.setSemestreAtual(dados.semestreAtual());
        perfil.setPontoEmbarquePadrao(pontoEmbarque);
        perfilAlunoRepository.save(perfil);

        return converterParaResponse(usuarioSalvo);
    }

    // A autorização de quem pode chamar este fluxo será aplicada na futura camada de segurança.
    @Transactional
    public UsuarioResponse cadastrarAdministrativo(
            @Valid CadastroUsuarioRequest dados,
            TipoUsuario tipoUsuario
    ) {
        if (tipoUsuario != TipoUsuario.MOTORISTA && tipoUsuario != TipoUsuario.ADMIN) {
            throw new RegraNegocioException(
                    "O cadastro administrativo permite apenas MOTORISTA ou ADMIN."
            );
        }
        return converterParaResponse(usuarioRepository.save(criarUsuario(dados, tipoUsuario)));
    }

    private Usuario criarUsuario(CadastroUsuarioRequest dados, TipoUsuario tipoUsuario) {

        String email = dados.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        String cpf = dados.cpf();

        if (!ValidadorCpf.ehValido(cpf)) {
            throw new RegraNegocioException(
                    "O CPF informado é inválido."
            );
        }

        if (usuarioRepository.existsByEmail(email)) {
            throw new RegraNegocioException(
                    "Já existe um usuário com este e-mail."
            );
        }

        if (usuarioRepository.existsByCpf(cpf)) {
            throw new RegraNegocioException(
                    "Já existe um usuário com este CPF."
            );
        }

        ValidadorSenha.validar(dados.senha());

        Usuario usuario = new Usuario();

        usuario.setNome(dados.nome().trim());
        usuario.setCpf(cpf);
        usuario.setTelefone(dados.telefone());
        usuario.setEndereco(dados.endereco().trim());
        usuario.setFoto(dados.foto());
        usuario.setEmail(email);

        usuario.setSenha(
                passwordEncoder.encode(dados.senha())
        );

        usuario.setTipoUsuario(tipoUsuario);
        usuario.setAtivo(true);

        return usuario;
    }
    private UsuarioResponse converterParaResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getTelefone(),
                usuario.getTipoUsuario(),
                usuario.isAtivo()
        );
    }

    @Transactional(readOnly = true)
    public Usuario buscarPorEmail(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RecursoNaoEncontradoException(
                                "Usuário não encontrado."
                        )
                );
    }
    @Transactional
    public UsuarioResponse atualizarDados(
            UUID id,
            @Valid @NotNull AtualizacaoUsuarioRequest dados
    ) {
        Usuario usuario = buscarPorId(id);

        String email = dados.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (!usuario.getEmail().equalsIgnoreCase(email)
                && usuarioRepository.existsByEmail(email)) {

            throw new RegraNegocioException(
                    "Já existe um usuário com este e-mail."
            );
        }

        usuario.setNome(dados.nome().trim());
        usuario.setTelefone(dados.telefone());
        usuario.setEndereco(dados.endereco().trim());
        usuario.setFoto(dados.foto());
        usuario.setEmail(email);

        return converterParaResponse(usuario);
    }

    @Transactional(readOnly = true)
    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }

    @Transactional
    public void desativar(UUID id) {
        Usuario usuario = buscarPorId(id);
        usuario.setAtivo(false);
    }

    @Transactional
    public void reativar(UUID id) {
        Usuario usuario = buscarPorId(id);
        usuario.setAtivo(true);
    }
    @Transactional
    public void alterarSenha(
            UUID id,
            @Valid @NotNull AlteracaoSenhaRequest dados
    ) {
        Usuario usuario = buscarPorId(id);

        if (!passwordEncoder.matches(
                dados.senhaAtual(),
                usuario.getSenha()
        )) {
            throw new RegraNegocioException(
                    "A senha atual está incorreta."
            );
        }

        ValidadorSenha.validar(dados.novaSenha());

        if (passwordEncoder.matches(
                dados.novaSenha(),
                usuario.getSenha()
        )) {
            throw new RegraNegocioException(
                    "A nova senha deve ser diferente da senha atual."
            );
        }

        usuario.setSenha(
                passwordEncoder.encode(dados.novaSenha())
        );
    }
}
