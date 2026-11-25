package com.maragogi.maragobus.entity;

import com.maragogi.maragobus.enums.StatusReserva;
import com.maragogi.maragobus.enums.TipoEventoReserva;
import com.maragogi.maragobus.enums.TipoUsuario;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Immutable
@Table(
        name = "eventos_reserva",
        indexes = {
                @Index(name = "idx_eventos_reserva_reserva_data", columnList = "reserva_id, data_hora_evento"),
                @Index(name = "idx_eventos_reserva_aluno_data", columnList = "aluno_id, data_hora_evento")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class EventoReserva {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "reserva_id", nullable = false, updatable = false)
    private UUID reservaId;

    @Column(name = "aluno_id", nullable = false, updatable = false)
    private UUID alunoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_evento", nullable = false, updatable = false, length = 40)
    private TipoEventoReserva tipoEvento;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", updatable = false, length = 30)
    private StatusReserva statusAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", nullable = false, updatable = false, length = 30)
    private StatusReserva statusNovo;

    @Column(name = "autor_id", nullable = false, updatable = false)
    private UUID autorId;

    @Column(name = "autor_nome_snapshot", nullable = false, updatable = false, length = 150)
    private String autorNomeSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "autor_tipo_snapshot", nullable = false, updatable = false, length = 30)
    private TipoUsuario autorTipoSnapshot;

    @Column(name = "motivo", updatable = false, length = 500)
    private String motivo;

    @Column(name = "data_hora_evento", nullable = false, updatable = false)
    private LocalDateTime dataHoraEvento;

    @Column(name = "data_utilizacao_snapshot", nullable = false, updatable = false)
    private LocalDate dataUtilizacaoSnapshot;

    @Column(name = "ponto_embarque_id_snapshot", updatable = false)
    private UUID pontoEmbarqueIdSnapshot;

    @Column(name = "ponto_embarque_nome_snapshot", updatable = false, length = 150)
    private String pontoEmbarqueNomeSnapshot;

    @Column(name = "faculdade_id_snapshot", updatable = false)
    private UUID faculdadeIdSnapshot;

    @Column(name = "faculdade_nome_snapshot", updatable = false, length = 150)
    private String faculdadeNomeSnapshot;

    @Column(name = "curso_nome_snapshot", updatable = false, length = 150)
    private String cursoNomeSnapshot;

    @PreUpdate
    private void impedirAlteracao() {
        throw new UnsupportedOperationException("Eventos de reserva são imutáveis e não podem ser alterados.");
    }

    @PreRemove
    private void impedirRemocao() {
        throw new UnsupportedOperationException("Eventos de reserva são imutáveis e não podem ser removidos.");
    }
}