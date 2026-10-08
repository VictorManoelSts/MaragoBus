package com.maragogi.maragobus.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.*;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE, RECORD_COMPONENT, TYPE_USE})
@Retention(RUNTIME)
@Constraint(validatedBy = SenhaConstraintValidator.class)
public @interface SenhaValida {
    String message() default ValidadorSenha.MENSAGEM;
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
