package com.maragogi.maragobus.exception;

public class ReservaDeOutroAlunoException extends RegraNegocioException {
    public ReservaDeOutroAlunoException() {
        super("A reserva não pertence ao aluno solicitante.");
    }
}
