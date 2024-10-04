//////////// SECTION // imports (if needed)
// import 'regenerator-runtime/runtime';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import axios from 'axios';
//hot module
// Your existing JavaScript code
console.log('Script is running...');

//////////// SECTION //variables
const API_URL = 'https://api.sokanacademy.com/api/forms/phase2plus';
const TIMEOUT_SEC = 10;
const formContainer = document.querySelector('.form-section__container');
let submitButton;

let form;
let inputValues = {};
const formElements = {
  text: (data) => basicInputMarkup(data),
  phone: (data) => basicInputMarkup(data),
  textarea: (data) => textareaInputMarkup(data),
  select: (data) => selectInputMarkup(data),
  radioButton: (data) => checkboxMarkup(data),
  checkboxGroup: (data) => checkboxMarkup(data),
};
let requiresChecked = false;
//////////// SECTION //helper functions
//handleTimeout
const handleTimeout = function (s) {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error(`Request took too long! Timeout after ${s} second`));
    }, s * 1000);
  });
};
const getValidationAttributes = function (validations) {
  let validationAttr = '';
  validations.forEach((validation) => {
    if (validation === 'required') {
      validationAttr += ' required ';
    }
    if (validation.startsWith('max:')) {
      const maxLength = validation.split(':')[1];
      validationAttr += ` maxlength="${maxLength}" `;
    }
  });
  return validationAttr;
};
const applyNumberPattern = function (data) {
  if (data.name === 'phone') {
    return `pattern="[0-9]{11}"`;
  } else if (data.name === 'birth-year') {
    return ` pattern="[0-9]{4}" `;
  }
};

//////////// SECTION //rendering functions
//create markups
const successMessage = function () {
  return `
    <div class="alert alert-success text-center vertical-spacing" role="alert">
      فرم با موفقیت ارسال شد. متشکریم!
    </div>
  `;
};

const networkErrorMarkup = function (post) {
  if (post) {
    return `<div class="text-danger text-center mt-2" >
      <strong>خطا در ارتباط با سرور!</strong> لطفا اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
    </div>`;
  }
  return `
 <div class="alert alert-danger text-center vertical-spacing" role="alert" >
      <strong>خطا در ارتباط با سرور!</strong> لطفا اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
    </div>
`;
};
const spinnerMarkup = function () {
  return `<div class="d-flex justify-content-center wait-spinner vertical-spacing">
             <div class="spinner-border" role="status">
             <span class="visually-hidden">لطفا منتظر بمانید...</span>
             </div>
        </div>`;
};

const baseInputMarkup = function (data, input, lastItem) {
  return `<div class="form__input form__input__base form__input__${data.type} form__input__${data.name}">
            ${input}
            <label for="${data.name}" class="form__label">
              ${
                data.type !== 'select'
                  ? data.label
                  : `<div class="form__label__text">${data.label}</div>
                 <img src="../assets/img/icons/arrow-down.svg" class="icon-sm form__label__icon" alt="arrow down"/>`
              }
            </label>
             
             <div class="invalid-feedback">
             لطفا  ${data.label}     خود را وارد کنید
             </div>
            </div>
            ${lastItem ? '' : '<hr class="form__inputs__divider">'}`;
};
const basicInputMarkup = function (data) {
  const markup = `<input type="${data.type === 'phone' ? 'tel' : data.type}" 
                            ${applyNumberPattern(data)}
                            class="form-control input--base  input__filed ${data.name}__input" 
                            id="${data.name}" 
                            placeholder="${data.placeholder ? data.placeholder : ''}" 
                            autocomplete="${data.name === 'fullname' ? 'name' : data.name}"
                            ${getValidationAttributes(data.validations)} ${data.name === 'phone' ? 'maxlength="11"' : data.name === 'birth-year' ? 'maxlength="4"' : ''}>`;
  return baseInputMarkup(data, markup, false);
};
const textareaInputMarkup = function (data) {
  const markup = `<textarea rows="5" 
                          class="form-control input--base input__filed ${data.name}__input" 
                          aria-label="With textarea" id="${data.name}" 
                          placeholder="${data.placeholder ? data.placeholder : ''}" 
                          ${getValidationAttributes(data.validations)}></textarea>`;
  return baseInputMarkup(data, markup, true);
};
const selectInputMarkup = function (data) {
  let options = '';
  data.options.forEach((option) => {
    options += `<option value="${option}" class="input--base">${option}</option>`;
  });
  const markup = `<select class="form-select input--base input__filed ${data.name}__input" 
                          aria-label="select" 
                          id="${data.name}" ${getValidationAttributes(data.validations)}>
                             <option value="" selected disabled >${data.placeholder}</option>
                              ${options}
                       </select>`;
  return baseInputMarkup(data, markup, false);
};
const checkboxMarkup = function (data) {
  let options = '';
  data.options.forEach((option, index) => {
    options += `<div class="form-check">
                   <input class="form-check-input input__filed ${data.name}__input" 
                   type="${data.type === 'checkboxGroup' ? 'checkbox' : 'radio'}" 
                   id="${data.type}optionNo${index}" 
                   value="${option}" 
                   ${data.type === 'radioButton' ? `name=${data.name}` : ''}
                    ${getValidationAttributes(data.validations)}>
                    <label class="form-check-label lh-lg " for="${data.type}optionNo${index}">${option}</label>
                </div>`;
  });
  const markup = `<div class="radiobtn__label t4 lh-lg text-secondary-2">${data.label}:</div>
                          ${options}`;
  return baseInputMarkup(data, markup, false);
};
const submitButtonMarkup = function (data) {
  return `<button class="btn form__submit__btn btn-gray-medium w-100" type="submit">
          ارسال فرم ${data.title}
        </button>`;
};
// create form elements based on schema
const formElementMarkup = function (item) {
  const elementGenerator = formElements[item.type];
  if (elementGenerator) {
    return elementGenerator(item);
  } else {
    console.warn(`Unsupported form element type: ${item.type}`);
    return ''; // Return an empty string to prevent breaking the form rendering
  }
};

// generate form markup
const formMarkup = function () {
  let markup = headingMarkup(form);
  let formInputs = [
    `<form class="form__inputs col form-flex needs-validation" novalidate>
                              <div class="form__input form-flex">`,
  ];

  form.schema.forEach((item) => {
    formInputs.push(formElementMarkup(item));
  });

  formInputs.push(`</div>`);
  formInputs.push(submitButtonMarkup(form));
  formInputs.push(`</form>`);

  markup += formInputs.join('\n');
  return markup;
};
const headingMarkup = function (data) {
  return `<div class="form__heading col form-flex">
            <h1 class="h1 lh-lg"> فرم ${data.title}</h1>
            <p class="lh-lg text-center">${data.description}</p>
          </div>`;
};
//////////// SECTION //fetch functions
const getFormData = async function () {
  try {
    const data = await Promise.race([
      axios.get(API_URL),
      handleTimeout(TIMEOUT_SEC),
    ]);
    return data.data.data;
  } catch (error) {
    console.error(`network error: ${error}`);
    //show alert
    displayNetworkAlertGet();
  }
};
const submitFormData = async (data) => {
  try {
    await Promise.race([
      await axios.post(API_URL, data, {}),
      handleTimeout(TIMEOUT_SEC),
    ]).then((response) => {
      if (response.status === 201) displaySuccessMessage();
    });
  } catch (error) {
    console.error(`network error: ${error}`);
    //show alert
    displayNetworkAlertPost();
  }
};

//////////// SECTION //form rendering control
const displaySpinner = function () {
  formContainer.innerHTML = spinnerMarkup();
};

const insertFormMarkup = function (formInput) {
  formContainer.innerHTML = '';
  formContainer.insertAdjacentHTML('beforeend', formInput);
};
const displayNetworkAlertPost = function () {
  formContainer.insertAdjacentHTML('beforeend', networkErrorMarkup(true));
};
const displayNetworkAlertGet = function () {
  formContainer.innerHTML = networkErrorMarkup();
};

const displaySuccessMessage = function () {
  formContainer.innerHTML = successMessage();
};
//////////// SECTION //event listeners and miscellaneous functions
const activateSelectInputs = function () {
  const selectElementSections = document.querySelectorAll(
    '.form__input__select'
  );
  selectElementSections.forEach((selectElementSection) => {
    const selectElement = selectElementSection.querySelector('.form-select');
    const selectLabel = selectElementSection.querySelector('.form__label');
    selectElement.addEventListener('change', function () {
      selectLabel.classList.add('form__label--move');
    });
  });
};
const handleSubmitButtonClick = async function () {
  const inputs = document.querySelectorAll('.input__filed');
  inputs.forEach((input) => {
    input.classList.forEach((className) => {
      if (className.endsWith('__input')) {
        let matchedClass = className.split('__')[0];
        //input.type === 'radio' ||
        if (input.type === 'checkbox') {
          if (!inputValues[matchedClass]) {
            inputValues[matchedClass] = [];
          }
          if (input.checked) {
            inputValues[matchedClass].push(input.value);
          }
        } else if (input.type === 'radio') {
          if (!inputValues[matchedClass]) {
            inputValues[matchedClass] = '';
          }
          if (input.checked) {
            inputValues[matchedClass] = input.value;
          }
        } else {
          inputValues[matchedClass] = input.value;
        }
      }
    });
  });
  if (requiresChecked) {
    await submitFormData(inputValues);
  }
};
const initializeSubmitButton = function () {
  submitButton = document.querySelector('.form__submit__btn');
  submitButton.addEventListener('click', handleSubmitButtonClick);
};
const removeCheckboxAndRadioLabels = function () {
  document
    .querySelector('.form__input__radioButton')
    .querySelector('.form__label')
    .remove();
  document
    .querySelector('.form__input__checkboxGroup')
    .querySelector('.form__label')
    .remove();
};

//////////// SECTION //validation functions
const validateNumberPattern = function (input) {
  const pattern = new RegExp(input.pattern);
  if (!pattern.test(input.value)) {
    input.classList.add('is-invalid');
    return true;
  } else {
    input.classList.remove('is-invalid');
    return false;
  }
};
const validateRequiredFields = function (inputs) {
  let requiresFailed = '';
  inputs.forEach((input) => {
    if (
      input.hasAttribute('required') &&
      !input.checkValidity() &&
      input.value.trim().length === 0
    ) {
      requiresFailed += true;
    } else if (input.id === 'phone') {
      requiresFailed += validateNumberPattern(input);
    } else if (input.id === 'birth-year') {
      requiresFailed += validateNumberPattern(input);
    }
  });

  return requiresFailed.includes('true');
};
const enableRealTimeValidation = function () {
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    input.addEventListener('input', () => {
      requiresChecked = !validateRequiredFields(inputs);

      if (requiresChecked) {
        submitButton.classList.remove('btn-gray-medium');
        submitButton.classList.add('btn-secondary-2');
      } else {
        submitButton.classList.remove('btn-secondary-2');
        submitButton.classList.add('btn-gray-medium');
      }
    });
  });
};
const initializeFormValidation = function () {
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      'submit',
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
          const firstInvalidInput = form.querySelector(':invalid');
          if (firstInvalidInput) {
            firstInvalidInput.focus();
          }
        }
        event.preventDefault();
        form.classList.add('was-validated');
      },
      false
    );
  });
};
//////////// SECTION //Initialization
const init = async function () {
  try {
    displaySpinner();
    form = await getFormData();
    const markup = formMarkup();
    insertFormMarkup(markup);
    removeCheckboxAndRadioLabels();
    activateSelectInputs();
    initializeSubmitButton();
    enableRealTimeValidation();
    initializeFormValidation();
  } catch (error) {
    console.error(error);
  }
};
await init();
