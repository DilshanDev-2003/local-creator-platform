// Show the category dropdown only when "Creator" is selected
const roleInputs = document.querySelectorAll('input[name="role"]');
const creatorFields = document.getElementById('creator-fields');

function toggleCreatorFields() {
  const selected = document.querySelector('input[name="role"]:checked').value;
  creatorFields.classList.toggle('d-none', selected !== 'creator');
}

roleInputs.forEach((input) => input.addEventListener('change', toggleCreatorFields));
toggleCreatorFields(); // run once on page load