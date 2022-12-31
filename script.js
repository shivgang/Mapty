'use strict';


class Workout {

  date = new Date();
  //We are converting our date into a string and then using last 10 characters of the date
  id = (Date.now() + '').slice(-10);
  clicks=0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //in km
    this.duration = duration; //in min

  }

  _setDescription() {
    //Using prettier-ignore just to keep the array in one line
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}
    ${this.date.getDate()}`;
  }

  click(){
    this.clicks++;
  }

}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
  }
};
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //  converting hour to minute
    this.speed = this.distance / (this.duration) / 60;
    return this.speed;
  }
};


// const run1=new Running([39,-22],5.2,24,178);
// const cycling1=new Cycling([39,-22],5.2,24,520);
// console.log(run1,cycling1);

//////////////////////////
//APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class App {
  #map;
  #mapZoomLevel=13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local LocalStorage
    this._getLocalStorage();
    //Attach event handlers
    //Binding the this of object to the function call otherwise it will contain this of form as on form the function is being called as callback
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click',this._moveToPopup.bind(this));

  }

  _getPosition() {
    //First function is for success
    //Second funcction is for error
    if (navigator.geolocation) {
      //We are binding this to the current object becuase in regular function calls the this is undefined,
      //as this is binded to the object on which the event listener is added so we will need to bind it explicitly here
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
        alert("Could not get your position");
      });
    }
  }

  _loadMap(position) {
    const {
      latitude,
      longitude
    } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    //map in bracket is  the id of html element where we want to display the map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    //we are using openstreet map here which is an open source map
    //The first map i.e.(map()) comes from leaflet library
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //Putting the markers

    //We are calling renderWorkoutMarker here because it can work only after the map is rendered
    this.#workouts.forEach(work=>{
      this._renderWorkoutMarker(work);

    });

  }
  _showForm(mapE) {
    //We want the mapEvent to be a global variable
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    //Clearing the input fields
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.classList.add('hidden');

  }

  _toggleElevationField() {
    //Selecting the closest parent with this class
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {

    //Helper function to check if the inputs are numbers
    const validInputs = (...inputs) =>
      //every method returns true is the condition is true for all of the inputs(if result is false for even one, then every will return false)
      inputs.every(inp => Number.isFinite(inp));
    //Helper function to check if the numbers are positive
    const allPositive = (...inputs) =>
      inputs.every(inp => inp > 0);

    //TO prevent the page from refreshing upon submitting the form
    e.preventDefault();

    //1- Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value; //(+ here is used to convert string to number)
    const duration = +inputDuration.value;
    //latlng is an element of mapEvent object(we are destructuring the object to get hold of latitude and longitude)
    const {
      lat,
      lng
    } = this.#mapEvent.latlng;
    let workout;
    //2- Check if data is valid
    //3- If the workout is running- Create Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //If even one of the input is Not a number or not positive then if condition will become true
      if (!validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence))
        return alert('Inputs have to be positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);

    }
    //4- If the workout is cycling- Create Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      //elevation can be negative
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
        return alert('Inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //5- Add new object to workout array
    this.#workouts.push(workout);

    //6- Render workout on map as marker
    this._renderWorkoutMarker(workout);
    //7- Render workout on list
    this._renderWorkout(workout);
    //8- Hide form + clear input fields
    this._hideForm();

    //9- Set local storage to all workout__details
    this._setLocalStorage();

  }
  _renderWorkoutMarker(workout) {

    //Creates the marker
    L.marker(workout.coords)
      //adding marker to the map
      .addTo(this.#map)
      //create a pop up and bind it to the marker
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      }))
      .setPopupContent(`${workout.type === 'running'? '🏃‍': '🚴'} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running'? '🏃‍': '🚴'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        `;
    if (workout.type === 'running') {
       html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">178</span>
            <span class="workout__unit">${workout.cadence}</span>
            </div>
          </li>
        `;
    }
    if (workout.type === 'cycling') {
      html+=`
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
    `;
    }
    //inserting our generated HTML at the end of form
    form.insertAdjacentHTML('afterend',html);
  }

  _moveToPopup(e){
    //Looks for the closest workout i.e.<li> with class workout
    const workoutEl = e.target.closest('.workout');

    if(!workoutEl) return;

    const workout=this.#workouts.find(
      work=> work.id === workoutEl.dataset.id
    );
    // console.log(workout);
    //Pointing the location for the workout clicked
    this.#map.setView(workout.coords, this.#mapZoomLevel,{
      animate: true,
      //Setting the animation duration to 1 sec
      pan:{
        duration:1
      },
    });
    //USING THE PUBLIC INTERFACE
    // workout.click();
    //Objects that we recieve back from localStorage will not inherit all the methods that they had before
  }
  _setLocalStorage(){
    //LocalStorage is an API provided by browser
    //workouts is our key
    //We store the logged workout in the browser local storage
    //Using JSON.stringify we are converting objects to strings
    localStorage.setItem('workouts',JSON.stringify(this.#workouts));
  }
  _getLocalStorage(){
    //Here, we will convert strings back into objects using parse
    const data=JSON.parse(localStorage.getItem('workouts'));
    //If there is no data, we simply return
    if(!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work=>{
      this._renderWorkout(work);

    });
  }
  //Clearing the data
  reset(){
    //removing the data
    localStorage.removeItem('workouts');
    //reloading the page
    location.reload();
  }

}

const app = new App();
