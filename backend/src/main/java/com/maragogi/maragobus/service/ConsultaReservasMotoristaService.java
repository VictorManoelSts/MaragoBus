package com.maragogi.maragobus.service;

import com.maragogi.maragobus.domain.reserva.RegrasTemporaisReserva;
import com.maragogi.maragobus.dto.reserva.*;
import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import com.maragogi.maragobus.exception.RecursoNaoEncontradoException;
import com.maragogi.maragobus.exception.RegraNegocioException;
import com.maragogi.maragobus.repository.ReservaRepository;
import com.maragogi.maragobus.repository.UsuarioRepository;
import com.maragogi.maragobus.repository.projection.ResumoReservasPorFaculdadePonto;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import java.time.LocalDate;
import java.util.*;

@Service
@Validated
@RequiredArgsConstructor
public class ConsultaReservasMotoristaService {
    private final UsuarioRepository usuarioRepository;
    private final ReservaRepository reservaRepository;
    private final RegrasTemporaisReserva regrasTemporais;

    // O UUID é interno; a identidade autenticada e a autorização HTTP continuam pendentes.
    @Transactional(readOnly = true)
    public ResumoReservasMotoristaResponse consultarResumo(@NotNull UUID motoristaId, @NotNull LocalDate dataUtilizacao) {
        var motorista = usuarioRepository.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (motorista.getTipoUsuario() != TipoUsuario.MOTORISTA) {
            throw new RegraNegocioException("Somente motoristas podem consultar o resumo de reservas.");
        }
        if (!motorista.isAtivo()) {
            throw new RegraNegocioException("O motorista está inativo.");
        }
        if (!regrasTemporais.ehDiaTransporte(dataUtilizacao)) {
            throw new RegraNegocioException("A data de utilização deve ser um dia de transporte.");
        }
        // A projeção já está ordenada no banco. Apenas os grupos agregados são materializados.
        var grupos = new LinkedHashMap<UUID, List<ResumoReservasPorFaculdadePonto>>();
        for (var linha : reservaRepository.resumirPorFaculdadeEPonto(dataUtilizacao, StatusReserva.CONFIRMADA)) {
            if (linha.faculdadeId() == null) {
                throw new RegraNegocioException("Inconsistência: reserva confirmada sem vínculo acadêmico com faculdade.");
            }
            grupos.computeIfAbsent(linha.faculdadeId(), id -> new ArrayList<>()).add(linha);
        }
        var faculdades = grupos.values().stream().map(linhas -> {
            var primeira = linhas.getFirst();
            var pontos = linhas.stream().map(l -> new ResumoPontoEmbarqueResponse(l.pontoEmbarqueId(),
                    l.pontoEmbarqueNome(), l.totalReservas())).toList();
            long total = pontos.stream().mapToLong(ResumoPontoEmbarqueResponse::totalReservas).sum();
            return new ResumoFaculdadeResponse(primeira.faculdadeId(), primeira.faculdadeNome(), total, pontos);
        }).toList();
        long total = faculdades.stream().mapToLong(ResumoFaculdadeResponse::totalReservas).sum();
        return new ResumoReservasMotoristaResponse(dataUtilizacao, total, faculdades.size(), faculdades);
    }
    /** Página começa em zero; tamanho nulo utiliza dez. Os filtros nulos consideram todos os grupos. */
    @Transactional(readOnly = true)
    public Page<PassageiroConfirmadoResponse> consultarPassageirosConfirmados(
            @NotNull UUID motoristaId, @NotNull LocalDate dataUtilizacao,
            UUID faculdadeId, UUID pontoEmbarqueId, int pagina, Integer tamanho) {
        int limite = tamanho == null ? 10 : tamanho;
        if (pagina < 0) {
            throw new RegraNegocioException("A página não pode ser negativa.");
        }
        if (limite < 1 || limite > 50) {
            throw new RegraNegocioException("O tamanho da página deve estar entre 1 e 50.");
        }
        var motorista = usuarioRepository.findById(motoristaId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        if (motorista.getTipoUsuario() != TipoUsuario.MOTORISTA) {
            throw new RegraNegocioException("Somente motoristas podem consultar os passageiros confirmados.");
        }
        if (!motorista.isAtivo()) {
            throw new RegraNegocioException("O motorista está inativo.");
        }
        if (!regrasTemporais.ehDiaTransporte(dataUtilizacao)) {
            throw new RegraNegocioException("A data de utilização deve ser um dia de transporte.");
        }
        // Verifica toda a data, inclusive fora da página/filtros, para manter a política do resumo.
        if (reservaRepository.contarReservasSemFaculdade(dataUtilizacao, StatusReserva.CONFIRMADA) > 0) {
            throw new RegraNegocioException("Inconsistência: reserva confirmada sem vínculo acadêmico com faculdade.");
        }
        return reservaRepository.consultarPassageirosConfirmados(dataUtilizacao, StatusReserva.CONFIRMADA,
                faculdadeId, pontoEmbarqueId, PageRequest.of(pagina, limite));
    }
}
