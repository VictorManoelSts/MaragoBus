package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.EscopoAviso;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "avisos_administrativos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvisoAdministrativo {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 2000)
    private String conteudo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EscopoAviso escopo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculdade_destino_id")
    private Faculdade faculdadeDestino;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "administrador_responsavel_id", nullable = false)
    private Usuario administradorResponsavel;

    @Column(name = "data_hora_publicacao", nullable = false)
    private LocalDateTime dataHoraPublicacao;

    @Builder.Default
    @Column(nullable = false)
    private boolean arquivado = false;

    @Column(name = "data_hora_arquivamento")
    private LocalDateTime dataHoraArquivamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "arquivado_por_id")
    private Usuario arquivadoPor;
}