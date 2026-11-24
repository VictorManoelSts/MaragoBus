package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.AcaoAuditoriaDistribuicao;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "historico_distribuicoes_transporte")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoricoDistribuicaoTransporte {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "distribuicao_id", nullable = false)
    private DistribuicaoTransporte distribuicao;

    @Column(name = "numero_revisao", nullable = false)
    private int numeroRevisao;

    @Enumerated(EnumType.STRING)
    @Column(name = "acao", nullable = false, length = 20)
    private AcaoAuditoriaDistribuicao acao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "motorista_responsavel_id", nullable = false)
    private Usuario motoristaResponsavel;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime dataHora;

    @Column(name = "resumo_alteracao", nullable = false, length = 500)
    private String resumoAlteracao;
}