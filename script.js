document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const card = document.querySelector('.calculator-card');
    const toScientificBtn = document.getElementById('to-scientific');
    const toBasicBtn = document.getElementById('to-basic');

    // Displays
    const displayBasic = document.getElementById('display-basic');
    const displayScientific = document.getElementById('display-scientific');
    const modeIndicator = document.getElementById('mode-indicator');

    const buttons = document.querySelectorAll('.btn');

    let currentInput = '';
    let isDegree = false; // Default is Radians
    let shouldResetDisplay = false;
    let isScientificMode = false;

    // Flip Logic
    toScientificBtn.addEventListener('click', () => {
        card.classList.add('is-flipped'); // Flip to back
        isScientificMode = true;
        syncDisplays(); // Ensure input carries over
    });

    toBasicBtn.addEventListener('click', () => {
        card.classList.remove('is-flipped'); // Flip to front
        isScientificMode = false;
        syncDisplays();
    });

    // Helper to sync displays when flipping
    function syncDisplays() {
        displayBasic.value = currentInput;
        displayScientific.value = currentInput;
    }

    // Helper to format numbers for display
    function formatNumber(num) {
        if (num === '' || num === '-' || num === 'Error') return num;
        const n = Number(num);
        if (isNaN(n)) return num;
        return n.toLocaleString('en-US', { maximumFractionDigits: 10 });
    }

    // Helper to protect against floating point errors
    function cleanResult(num) {
        return parseFloat(num.toFixed(10));
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-value');
            handleInput(value);
        });
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        const key = e.key;

        if (/[0-9]/.test(key)) handleInput(key);
        else if (['+', '-', '*', '/', '.', '(', ')', '%', '^'].includes(key)) handleInput(key);
        else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleInput('=');
        }
        else if (key === 'Backspace') handleInput('DEL');
        else if (key === 'Escape' || key === 'c' || key === 'C') handleInput('C');
    });

    function handleInput(value) {
        if (value === 'C') {
            currentInput = '';
            syncDisplays();
            return;
        }

        if (value === 'DEL') {
            currentInput = currentInput.toString().slice(0, -1);
            syncDisplays();
            return;
        }

        if (value === 'deg') {
            isDegree = !isDegree;
            if (modeIndicator) modeIndicator.textContent = isDegree ? 'DEG' : 'RAD';
            return;
        }

        if (value === '=') {
            if (!currentInput) return;
            try {
                let expression = currentInput;

                // --- Pre-processing for Scientific Functions ---

                // P1. Handle Constants
                expression = expression.replace(/pi/g, 'Math.PI');
                expression = expression.replace(/e/g, 'Math.E');

                // P2. Handle Power operator ^
                expression = expression.replace(/\^/g, '**');

                // P3. Handle Square Root
                expression = expression.replace(/sqrt/g, 'Math.sqrt');

                // P4. Handle Log and Ln
                expression = expression.replace(/log/g, 'Math.log10');
                expression = expression.replace(/ln/g, 'Math.log');

                // P5. Handle Factorial (!)
                if (expression.includes('!')) {
                    expression = expression.replace(/(\d+)!/g, 'factorial($1)');
                    expression = expression.replace(/\(([^)]+)\)!/g, 'factorial($1)');
                }

                // P6. Handle Trig Functions with Mode
                expression = expression.replace(/sin/g, 'trig("sin",');
                expression = expression.replace(/cos/g, 'trig("cos",');
                expression = expression.replace(/tan/g, 'trig("tan",');

                // P7. Handle 1/x (inv)
                expression = expression.replace(/inv/g, 'inverse');

                // --- Evaluation ---

                const factorial = (n) => {
                    if (n < 0) return NaN;
                    if (n === 0 || n === 1) return 1;
                    let result = 1;
                    for (let i = 2; i <= n; i++) result *= i;
                    return result;
                };

                const trig = (func, val) => {
                    if (isDegree) {
                        val = val * Math.PI / 180;
                    }
                    let res = Math[func](val);
                    if (Math.abs(res) < 1e-10) res = 0;
                    if (Math.abs(res - 1) < 1e-10) res = 1;
                    return res;
                };

                const inverse = (x) => 1 / x;

                const evaluate = new Function('trig', 'factorial', 'inverse', 'return ' + expression);

                const result = evaluate(trig, factorial, inverse);

                if (!isFinite(result) || isNaN(result)) {
                    currentInput = '';
                    displayBasic.value = 'Error';
                    displayScientific.value = 'Error';
                    shouldResetDisplay = true;
                    return;
                }

                const preciseResult = cleanResult(result);
                currentInput = preciseResult.toString();
                syncDisplays();
                shouldResetDisplay = true;

            } catch (error) {
                console.error(error);
                currentInput = '';
                displayBasic.value = 'Error';
                displayScientific.value = 'Error';
                shouldResetDisplay = true;
            }
            return;
        }

        // Logic for specialized buttons appending text
        if (['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'].includes(value)) {
            if (shouldResetDisplay) {
                currentInput = '';
                shouldResetDisplay = false;
            }
            currentInput += value + '(';
        } else if (value === 'inv') {
            if (shouldResetDisplay) {
                currentInput = '';
                shouldResetDisplay = false;
            }
            currentInput += 'inv(';
        } else if (value === 'fact') {
            currentInput += '!';
        } else if (value === 'pi') {
            if (shouldResetDisplay) {
                currentInput = '';
                shouldResetDisplay = false;
            }
            currentInput += 'pi';
        } else if (value === 'e') {
            if (shouldResetDisplay) {
                currentInput = '';
                shouldResetDisplay = false;
            }
            currentInput += 'e';
        } else if (value === '^') {
            currentInput += '^';
            shouldResetDisplay = false;
        }
        else {
            // Basic operators and numbers
            if (['+', '-', '*', '/', '%'].includes(value)) {
                if (shouldResetDisplay) shouldResetDisplay = false;
                const lastChar = currentInput.slice(-1);
                if (['+', '-', '*', '/', '%', '.'].includes(lastChar)) {
                    currentInput = currentInput.slice(0, -1) + value;
                } else {
                    currentInput += value;
                }
            } else {
                if (shouldResetDisplay) {
                    if (!['+', '-', '*', '/', '%', '^', ')', '!'].includes(value)) {
                        currentInput = '';
                    }
                    shouldResetDisplay = false;
                }
                currentInput += value;
            }
        }

        syncDisplays();
    }
});
