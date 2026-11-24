package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.aviso.AvisoAdministrativoResponse;
import com.maragogi.maragobus.dto.aviso.AvisoAlunoResponse;
import com.maragogi.maragobus.dto.aviso.CriacaoAvisoAdministrativoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.EscopoAviso;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Validated
public class AvisoAdministrativoService {
    private static final ZoneId FUSO = ZoneId.of("America/Maceio");
    private static final int TAMANHO_PADRAO = 10;
    private static final int TAMANHO_MAXIMO = 50;

    private final AvisoAdministrativoRepository avisos;
    private final LeituraAvisoAlunoRepository leituras;
    private final UsuarioRepository usuarios;
    private final PerfilAlunoRepository perfis;
    private final FaculdadeRepository faculdades;
    private final Clock clock;

    public AvisoAdministrativoService(
            AvisoAdministrativoRepository avisos,
            LeituraAvisoAlunoRepository leituras,
            UsuarioRepository usuarios,
            PerfilAlunoRepository perfis,
            FaculdadeRepository faculdades,
            Clock clock) {
        this.avisos = avisos;
        this.leituras = leituras;
        this.usuarios = usuarios;
        this.perfis = perfis;
        this.faculdades = faculdades;
        this.clock = clock.withZone(FUSO);
    }

    @Transactional
    public AvisoAdministrativoResponse publicar(
            @NotNull(message = "O administrador é obrigatório.") UUID adminId,
            @NotNull(message = "Os dados do aviso são obrigatórios.") @Valid CriacaoAvisoAdministrativoRequest dados) {
        Usuario admin = validarUsuarioAtivo(adminId, TipoUsuario.ADMIN,
                "Somente administradores podem publicar avisos.");

        Faculdade faculdadeDestino = null;
        if (dados.escopo() == EscopoAviso.GERAL) {
            if (dados.faculdadeDestinoId() != null) {
                throw new RegraNegocioException("Avisos gerais não devem informar faculdade de destino.");
            }
        } else {
            if (dados.faculdadeDestinoId() == null) {
                throw new RegraNegocioException("A faculdade de destino é obrigatória para avisos por faculdade.");
            }
            faculdadeDestino = faculdades.findById(dados.faculdadeDestinoId())
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Faculdade não encontrada."));
        }

        AvisoAdministrativo aviso = avisos.saveAndFlush(AvisoAdministrativo.builder()
                .titulo(dados.titulo().trim())
                .conteudo(dados.conteudo().trim())
                .escopo(dados.escopo())
                .faculdadeDestino(faculdadeDestino)
                .administradorResponsavel(admin)
                .dataHoraPublicacao(LocalDateTime.now(clock))
                .arquivado(false)
                .build());

        return mapearParaAdmin(aviso);
    }

    @Transactional
    public AvisoAdministrativoResponse arquivar(
            @NotNull(message = "O administrador é obrigatório.") UUID adminId,
            @NotNull(message = "O aviso é obrigatório.") UUID avisoId) {
        Usuario admin = validarUsuarioAtivo(adminId, TipoUsuario.ADMIN,
                "Somente administradores podem arquivar avisos.");

        AvisoAdministrativo aviso = avisos.findByIdComDetalhes(avisoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aviso não encontrado."));

        if (aviso.isArquivado()) {
            throw new RegraNegocioException("O aviso já está arquivado.");
        }

        aviso.setArquivado(true);
        aviso.setDataHoraArquivamento(LocalDateTime.now(clock));
        aviso.setArquivadoPor(admin);

        return mapearParaAdmin(avisos.saveAndFlush(aviso));
    }

    @Transactional(readOnly = true)
    public Page<AvisoAdministrativoResponse> consultarParaAdministracao(
            @NotNull(message = "O administrador é obrigatório.") UUID adminId,
            boolean incluirArquivados,
            int pagina,
            Integer tamanho) {
        int limite = validarPaginacao(pagina, tamanho);
        validarUsuarioAtivo(adminId, TipoUsuario.ADMIN,
                "Somente administradores podem consultar a gestão de avisos.");

        return avisos.findParaAdministracao(incluirArquivados, PageRequest.of(pagina, limite))
                .map(this::mapearParaAdmin);
    }

    @Transactional(readOnly = true)
    public Page<AvisoAlunoResponse> consultarParaAluno(
            @NotNull(message = "O aluno é obrigatório.") UUID alunoId,
            int pagina,
            Integer tamanho) {
        int limite = validarPaginacao(pagina, tamanho);
        validarUsuarioAtivo(alunoId, TipoUsuario.ALUNO,
                "Somente alunos podem consultar avisos segmentados.");
        UUID faculdadeAlunoId = obterFaculdadeDoAluno(alunoId);

        Page<AvisoAdministrativo> paginaAvisos = avisos.findVisiveisParaFaculdade(
                faculdadeAlunoId, PageRequest.of(pagina, limite));

        List<UUID> ids = paginaAvisos.getContent().stream().map(AvisoAdministrativo::getId).toList();
        Map<UUID, LocalDateTime> leiturasPorAviso = ids.isEmpty()
                ? Map.of()
                : leituras.findByAlunoIdAndAvisoIdIn(alunoId, ids).stream()
                .collect(Collectors.toMap(l -> l.getAviso().getId(), LeituraAvisoAluno::getDataHoraLeitura));

        return paginaAvisos.map(a -> mapearParaAluno(a, leiturasPorAviso.get(a.getId())));
    }

    @Transactional
    public AvisoAlunoResponse marcarComoLido(
            @NotNull(message = "O aluno é obrigatório.") UUID alunoId,
            @NotNull(message = "O aviso é obrigatório.") UUID avisoId) {
        Usuario aluno = validarUsuarioAtivo(alunoId, TipoUsuario.ALUNO,
                "Somente alunos podem marcar avisos como lidos.");
        UUID faculdadeAlunoId = obterFaculdadeDoAluno(alunoId);

        AvisoAdministrativo aviso = avisos.findByIdComDetalhes(avisoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Aviso não encontrado."));

        if (aviso.isArquivado()) {
            throw new RegraNegocioException("Não é possível marcar como lido um aviso arquivado.");
        }
        if (aviso.getEscopo() == EscopoAviso.POR_FACULDADE
                && (aviso.getFaculdadeDestino() == null || !faculdadeAlunoId.equals(aviso.getFaculdadeDestino().getId()))) {
            throw new RegraNegocioException("O aviso não está disponível para a faculdade do aluno.");
        }

        LeituraAvisoAluno leitura = leituras.findByAvisoIdAndAlunoId(avisoId, alunoId)
                .orElseGet(() -> leituras.saveAndFlush(LeituraAvisoAluno.builder()
                        .aviso(aviso)
                        .aluno(aluno)
                        .dataHoraLeitura(LocalDateTime.now(clock))
                        .build()));

        return mapearParaAluno(aviso, leitura.getDataHoraLeitura());
    }

    private Usuario validarUsuarioAtivo(UUID usuarioId, TipoUsuario tipoEsperado, String mensagemTipo) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (usuario.getTipoUsuario() != tipoEsperado) {
            throw new RegraNegocioException(mensagemTipo);
        }
        if (!usuario.isAtivo()) {
            throw new RegraNegocioException("O usuário está inativo.");
        }
        return usuario;
    }

    private UUID obterFaculdadeDoAluno(UUID alunoId) {
        PerfilAluno perfil = perfis.findByUsuarioId(alunoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil acadêmico do aluno não encontrado."));
        if (perfil.getCursoOfertado() == null || perfil.getCursoOfertado().getFaculdade() == null) {
            throw new RegraNegocioException("O aluno não possui vínculo acadêmico com faculdade.");
        }
        return perfil.getCursoOfertado().getFaculdade().getId();
    }

    private int validarPaginacao(int pagina, Integer tamanho) {
        int limite = tamanho == null ? TAMANHO_PADRAO : tamanho;
        if (pagina < 0 || limite < 1 || limite > TAMANHO_MAXIMO) {
            throw new RegraNegocioException("Parâmetros de paginação inválidos.");
        }
        return limite;
    }

    private AvisoAdministrativoResponse mapearParaAdmin(AvisoAdministrativo a) {
        return new AvisoAdministrativoResponse(
                a.getId(),
                a.getTitulo(),
                a.getConteudo(),
                a.getEscopo(),
                a.getFaculdadeDestino() == null ? null : a.getFaculdadeDestino().getId(),
                a.getFaculdadeDestino() == null ? null : a.getFaculdadeDestino().getNome(),
                a.getAdministradorResponsavel().getId(),
                a.getAdministradorResponsavel().getNome(),
                a.getDataHoraPublicacao(),
                a.isArquivado(),
                a.getDataHoraArquivamento(),
                a.getArquivadoPor() == null ? null : a.getArquivadoPor().getId(),
                a.getArquivadoPor() == null ? null : a.getArquivadoPor().getNome()
        );
    }

    private AvisoAlunoResponse mapearParaAluno(AvisoAdministrativo a, LocalDateTime dataHoraLeitura) {
        return new AvisoAlunoResponse(
                a.getId(),
                a.getTitulo(),
                a.getConteudo(),
                a.getEscopo(),
                a.getFaculdadeDestino() == null ? null : a.getFaculdadeDestino().getId(),
                a.getFaculdadeDestino() == null ? null : a.getFaculdadeDestino().getNome(),
                a.getDataHoraPublicacao(),
                dataHoraLeitura != null,
                dataHoraLeitura
        );
    }
}