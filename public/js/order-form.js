(() => {
  const form = document.querySelector('#orderForm');
  if (!form) return;

  const rowsContainer = document.querySelector('#itemRows');
  const rowTemplate = document.querySelector('#itemRowTemplate');
  const addButton = document.querySelector('#addItemButton');
  const totalElement = document.querySelector('#total');
  const totalQuantityElement = document.querySelector('#totalQuantity');
  const warningElement = document.querySelector('#quantityWarning');
  const submitButton = document.querySelector('#submitBtn');
  const unitPrice = Number(rowsContainer.dataset.price);
  const maxTotal = Number(rowsContainer.dataset.maxTotal);
  const maxRows = rowTemplate.content.querySelectorAll('option').length - 1;

  const csrf = form.querySelector('[name="_csrf"]').value;
  form.action = `/order?_csrf=${encodeURIComponent(csrf)}`;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(value);

  function getRows() {
    return [...rowsContainer.querySelectorAll('.order-item-row')];
  }

  function updateRemoveButtons() {
    const rows = getRows();
    rows.forEach((row) => {
      const button = row.querySelector('.remove-item');
      button.disabled = rows.length === 1;
      button.title = rows.length === 1 ? 'ต้องมีอย่างน้อยหนึ่งรายการ' : 'ลบรายการนี้';
    });
    addButton.disabled = rows.length >= maxRows;
  }

  function updateAvailableSizes() {
    const rows = getRows();
    const selectedSizes = rows.map((row) => row.querySelector('.item-size').value).filter(Boolean);
    rows.forEach((row) => {
      const currentSelect = row.querySelector('.item-size');
      [...currentSelect.options].forEach((option) => {
        option.disabled =
          option.value !== '' &&
          option.value !== currentSelect.value &&
          selectedSizes.includes(option.value);
      });
    });
  }

  function updateSummary() {
    const totalQuantity = getRows().reduce((sum, row) => {
      return sum + (Number(row.querySelector('.item-quantity').value) || 0);
    }, 0);

    totalElement.textContent = formatCurrency(totalQuantity * unitPrice);
    totalQuantityElement.textContent = String(totalQuantity);

    const exceedsLimit = totalQuantity > maxTotal;
    warningElement.classList.toggle('d-none', !exceedsLimit);
    warningElement.textContent = exceedsLimit
      ? `จำนวนเสื้อรวมต้องไม่เกิน ${maxTotal} ตัว (ขณะนี้ ${totalQuantity} ตัว)`
      : '';

    submitButton.disabled = exceedsLimit;
    return !exceedsLimit;
  }

  function bindRow(row) {
    row.querySelector('.item-quantity').addEventListener('input', updateSummary);
    row.querySelector('.item-size').addEventListener('change', updateAvailableSizes);
    row.querySelector('.remove-item').addEventListener('click', () => {
      if (getRows().length === 1) return;
      row.remove();
      updateRemoveButtons();
      updateAvailableSizes();
      updateSummary();
    });
  }

  getRows().forEach(bindRow);

  addButton.addEventListener('click', () => {
    if (getRows().length >= maxRows) return;
    const newRow = rowTemplate.content.firstElementChild.cloneNode(true);
    rowsContainer.appendChild(newRow);
    bindRow(newRow);
    updateRemoveButtons();
    updateAvailableSizes();
    updateSummary();
    newRow.querySelector('.item-size').focus();
  });

  form.addEventListener('submit', (event) => {
    if (!updateSummary() || !form.checkValidity()) {
      event.preventDefault();
      form.classList.add('was-validated');
      return;
    }

    submitButton.disabled = true;
    submitButton.querySelector('.normal').classList.add('d-none');
    submitButton.querySelector('.loading').classList.remove('d-none');
  });

  updateRemoveButtons();
  updateAvailableSizes();
  updateSummary();
})();
