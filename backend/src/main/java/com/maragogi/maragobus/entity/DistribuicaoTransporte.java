package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.StatusDistribuicaoTransporte;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "distribuicoes_transporte")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistribuicaoTransporte {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "data_utilizacao", nullable = false, unique = true)
    private LocalDate dataUtilizacao;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private StatusDistribuicaoTransporte status = StatusDistribuicaoTransporte.RASCUNHO;

    @Version
    @Column(name = "versao", nullable = false)
    private Long versao;

    @Column(name = "numero_revisao", nullable = false)
    @Builder.Default
    private int numeroRevisao = 1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ultimo_editor_id", nullable = false)
    private Usuario ultimoEditor;

    @Column(name = "data_hora_ultima_edicao", nullable = false)
    private LocalDateTime dataHoraUltimaEdicao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publicado_por_id")
    private Usuario publicadoPor;

    @Column(name = "data_hora_publicacao")
    private LocalDateTime dataHoraPublicacao;
}