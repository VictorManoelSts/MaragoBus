package com.maragogi.maragobus.service;

import com.maragogi.maragobus.dto.aviso.CriacaoAvisoAdministrativoRequest;
import com.maragogi.maragobus.entity.*;
import com.maragogi.maragobus.enums.EscopoAviso;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AvisoAdministrativoServiceTest {

    @Mock AvisoAdministrativoRepository avisos;
    @Mock LeituraAvisoAlunoRepository leituras;
    @Mock UsuarioRepository usuarios;
    @Mock PerfilAlunoRepository perfis;
    @Mock FaculdadeRepository faculdades;

    private final Usuario admin = Usuario.builder()
            .id(UUID.randomUUID()).nome("Admin").tipoUsuario(TipoUsuario.ADMIN).build();
    private final Usuario aluno = Usuario.builder()
            .id(UUID.randomUUID()).nome("Aluno").tipoUsuario(TipoUsuario.ALUNO).build();
    private final Usuario motorista = Usuario.builder()
            .id(UUID.randomUUID()).nome("Motorista").tipoUsuario(TipoUsuario.MOTORISTA).build();
    private final Faculdade faculdadeA = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade A").build();
    private final Faculdade faculdadeB = Faculdade.builder().id(UUID.randomUUID()).nome("Faculdade B").build();

    private AvisoAdministrativoService service(String agora) {
        Clock clock = Clock.fixed(
                LocalDateTime.parse(agora).atZone(ZoneId.of("America/Maceio")).toInstant(),
                ZoneOffset.UTC
        );
        return new AvisoAdministrativoService(avisos, leituras, usuarios, perfis, faculdades, clock);
    }

    @Test
    void devePublicarAvisoGeralComSucesso() {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(avisos.saveAndFlush(any(AvisoAdministrativo.class))).thenAnswer(inv -> {
            AvisoAdministrativo a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        var req = new CriacaoAvisoAdministrativoRequest("  Aviso Geral  ", "  Conteúdo  ", EscopoAviso.GERAL, null);
        var resp = service("2026-10-14T10:00:00").publicar(admin.getId(), req);

        assertEquals("Aviso Geral", resp.titulo());
        assertEquals("Conteúdo", resp.conteudo());
        assertEquals(EscopoAviso.GERAL, resp.escopo());
        assertNull(resp.faculdadeDestinoId());
        assertFalse(resp.arquivado());
    }

    @Test
    void deveRejeitarPublicacaoPorNaoAdministrador() {
        when(usuarios.findById(motorista.getId())).thenReturn(Optional.of(motorista));
        var req = new CriacaoAvisoAdministrativoRequest("Aviso", "Conteúdo", EscopoAviso.GERAL, null);

        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").publicar(motorista.getId(), req));
        verify(avisos, never()).saveAndFlush(any());
    }

    @Test
    void deveRejeitarInconsistenciaEntreEscopoEFaculdadeDestino() {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin));

        // GERAL com faculdade informada
        var geralInvalido = new CriacaoAvisoAdministrativoRequest(
                "Aviso", "Conteúdo", EscopoAviso.GERAL, faculdadeA.getId());
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").publicar(admin.getId(), geralInvalido));

        // POR_FACULDADE sem faculdade informada
        var porFaculdadeInvalido = new CriacaoAvisoAdministrativoRequest(
                "Aviso", "Conteúdo", EscopoAviso.POR_FACULDADE, null);
        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").publicar(admin.getId(), porFaculdadeInvalido));
    }

    @Test
    void deveBloquearLeituraDeAvisoDeOutraFaculdadeOuArquivado() {
        when(usuarios.findById(aluno.getId())).thenReturn(Optional.of(aluno));
        var ofertaA = CursoOfertado.builder().faculdade(faculdadeA).build();
        when(perfis.findByUsuarioId(aluno.getId()))
                .thenReturn(Optional.of(PerfilAluno.builder().usuario(aluno).cursoOfertado(ofertaA).build()));

        var avisoOutraFaculdade = AvisoAdministrativo.builder()
                .id(UUID.randomUUID()).titulo("Aviso B").conteudo("Texto")
                .escopo(EscopoAviso.POR_FACULDADE).faculdadeDestino(faculdadeB)
                .administradorResponsavel(admin).dataHoraPublicacao(LocalDateTime.of(2026, 10, 14, 9, 0))
                .arquivado(false).build();
        when(avisos.findByIdComDetalhes(avisoOutraFaculdade.getId())).thenReturn(Optional.of(avisoOutraFaculdade));

        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").marcarComoLido(aluno.getId(), avisoOutraFaculdade.getId()));

        var avisoArquivado = AvisoAdministrativo.builder()
                .id(UUID.randomUUID()).titulo("Arquivado").conteudo("Texto")
                .escopo(EscopoAviso.GERAL).administradorResponsavel(admin)
                .dataHoraPublicacao(LocalDateTime.of(2026, 10, 14, 9, 0)).arquivado(true).build();
        when(avisos.findByIdComDetalhes(avisoArquivado.getId())).thenReturn(Optional.of(avisoArquivado));

        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").marcarComoLido(aluno.getId(), avisoArquivado.getId()));
        verify(leituras, never()).saveAndFlush(any());
    }

    @Test
    void deveRejeitarArquivamentoDeAvisoJaArquivado() {
        when(usuarios.findById(admin.getId())).thenReturn(Optional.of(admin));
        var aviso = AvisoAdministrativo.builder().id(UUID.randomUUID()).arquivado(true).build();
        when(avisos.findByIdComDetalhes(aviso.getId())).thenReturn(Optional.of(aviso));

        assertThrows(RegraNegocioException.class,
                () -> service("2026-10-14T10:00:00").arquivar(admin.getId(), aviso.getId()));
        verify(avisos, never()).saveAndFlush(any());
    }
}