package com.nutrition.exception;

import lombok.Getter;
import java.math.BigDecimal;

/**
 * Exception thrown when a user wallet has insufficient funds to book an appointment or complete a transaction.
 */
@Getter
public class LowBalanceException extends RuntimeException {
    private final BigDecimal currentBalance;
    private final BigDecimal requiredAmount;
    private final BigDecimal deficit;

    /**
     * Constructs a LowBalanceException with financial discrepancy details.
     *
     * @param currentBalance user's current available wallet balance
     * @param requiredAmount total fee required for the transaction
     * @param deficit difference between required amount and current balance
     * @param message descriptive error message
     */
    public LowBalanceException(BigDecimal currentBalance, BigDecimal requiredAmount, BigDecimal deficit, String message) {
        super(message);
        this.currentBalance = currentBalance;
        this.requiredAmount = requiredAmount;
        this.deficit = deficit;
    }
}
