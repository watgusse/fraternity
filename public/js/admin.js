(() => {
  const selectAll = document.querySelector('#selectAll');
  if (selectAll)
    selectAll.addEventListener('change', () =>
      document.querySelectorAll('.order-check').forEach((c) => (c.checked = selectAll.checked)),
    );
  document.querySelectorAll('.delete-order-form').forEach((form) =>
    form.addEventListener('submit', (event) => {
      if (!window.confirm('ยืนยันลบคำสั่งซื้อนี้และไฟล์สลิปอย่างถาวร?')) event.preventDefault();
    }),
  );
  const forms = document.querySelectorAll('.status-form'),
    modalEl = document.querySelector('#statusModal'),
    confirm = document.querySelector('#confirmStatus');
  if (!modalEl) return;
  const modal = new bootstrap.Modal(modalEl);
  let pending = null;
  forms.forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      pending = f;
      modal.show();
    }),
  );
  confirm.addEventListener('click', () => {
    if (pending) {
      confirm.disabled = true;
      pending.submit();
    }
  });
})();
