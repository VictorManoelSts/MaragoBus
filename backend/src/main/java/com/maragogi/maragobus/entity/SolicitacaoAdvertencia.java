package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.StatusSolicitacaoAdvertencia;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "solicitacoes_advertencia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitacaoAdvertencia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aluno_id", nullable = false)
    private Usuario aluno;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "motorista_solicitante_id", nullable = false)
    private Usuario motoristaSolicitante;

    @Column(nullable = false, length = 1000)
    private String descricao;

    @Column(name = "data_hora_solicitacao", nullable = false)
    private LocalDateTime dataHoraSolicitacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private StatusSolicitacaoAdvertencia status =
            StatusSolicitacaoAdvertencia.PENDENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "administrador_responsavel_id")
    private Usuario administradorResponsavel;

    @Column(name = "data_hora_analise")
    private LocalDateTime dataHoraAnalise;

    @Column(name = "observacao_analise", length = 1000)
    private String observacaoAnalise;
}
