
function calculateMaturity(principal, rate, startDateStr, maturityDateStr, frequency) {
    let p = parseFloat(principal);
    let r = parseFloat(rate);
    let start = new Date(startDateStr);
    let end = new Date(maturityDateStr);

    if (isNaN(p) || isNaN(r) || !start || !end) return 0;

    let monthsToAdd = 3; // Default Quarterly
    switch (frequency) {
        case 'Monthly': monthsToAdd = 1; break;
        case 'Quarterly': monthsToAdd = 3; break;
        case 'Half-Yearly': monthsToAdd = 6; break;
        case 'Yearly': monthsToAdd = 12; break;
    }

    let currentDate = new Date(start);
    let currentAmount = p;

    console.log(`Starting Calculation: P=${p}, R=${r}, Freq=${frequency}`);

    // Loop for full compounding periods
    while (true) {
        let nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

        if (nextDate > end) break; // Stop if next compounding date is past maturity

        // Interest for this period
        // For standard periods, rate is annual rate / (12 / months)
        // e.g. Quarterly: 7.05 / 4
        let periodicRate = r / (12 / monthsToAdd);
        let interest = currentAmount * (periodicRate / 100);

        // ROUNDING IS KEY
        let roundedInterest = Math.round(interest);

        console.log(`Period: ${currentDate.toISOString().split('T')[0]} to ${nextDate.toISOString().split('T')[0]}. Int: ${interest.toFixed(4)} -> ${roundedInterest}`);

        currentAmount += roundedInterest;
        currentDate = nextDate;
    }

    // Remaining broken period (Simple Interest)
    // Diff in days
    const diffTime = Math.abs(end - currentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        // IBA rule: Simple interest for broken days at annual rate / 365
        let brokenInterest = currentAmount * (r / 100) * (diffDays / 365);
        let roundedBrokenInterest = Math.round(brokenInterest);

        console.log(`Broken Period: ${diffDays} days. Int: ${brokenInterest.toFixed(4)} -> ${roundedBrokenInterest}`);
        currentAmount += roundedBrokenInterest;
    }

    return currentAmount;
}

const result = calculateMaturity(160000, 7.05, '2025-05-15', '2026-05-15', 'Quarterly');
console.log(`Final Result: ${result}`);
console.log(`Expected: 171582`);
