import {moon, studio, icons} from './moon_assets'

const MESSAGES = {
    uk: ['Режисер сказав "мотор". Сервер почув.', 'Підключаємо місяць до мережі…', 'Ховаємо спойлери…', 'Репетуємо дубль номер 47…', 'Майже готово…'],
    ru: ['Режиссёр сказал "мотор". Сервер услышал.', 'Подключаем луну к сети…', 'Прячем спойлеры…', 'Репетируем дубль номер 47…', 'Почти готово…'],
    en: ['The director said "action". The server heard.', 'Connecting the moon to the network…', 'Hiding spoilers…', 'Rehearsing take number 47…', 'Almost ready…'],
    be: ['Рэжысёр сказаў "матор". Сервер пачуў.', 'Падключаем месяц да сеткі…', 'Хаваем спойлеры…', 'Рэпеціруем дублю нумар 47…', 'Амаль гатова…']
}

let timer, msg_timer
let started = 0

// Мінімальний час показу заставки, щоб анімація догравала повністю
const MIN_TIME = 7000

function messages(){
    let code = (window.localStorage.getItem('language') || (navigator.language || 'uk').slice(0, 2)).toLowerCase()

    return MESSAGES[code] || MESSAGES.uk
}

/**
 * Заставка Moon Studio на .welcome: місяць, напис, лоадер з жартами
 */
function init(){
    let welcome = document.querySelector('.welcome')

    if(!welcome || welcome.getAttribute('data-moon')) return

    let list = messages()

    started = Date.now()

    welcome.setAttribute('data-moon', 'true')
    welcome.setAttribute('data-splash', 'together')
    welcome.innerHTML = '<div class="welcome__bg lang__bg"></div><div class="ms-stage"><div class="mw"><div class="ms-ring"></div>' + moon + '</div>' + studio +
        '<div class="ld"><div class="spin"></div><p class="msg fade"></p><div class="bar"><i></i></div></div></div>'

    background(welcome.querySelector('.welcome__bg'))

    let msg = welcome.querySelector('.msg')
    let bar = welcome.querySelector('.bar i')
    let pos = 0

    msg.textContent = list[0]

    timer = setTimeout(()=>{
        bar.style.transition = 'width 5s cubic-bezier(.3,.6,.4,1)'
        bar.style.width      = '100%'

        msg_timer = setInterval(()=>{
            if(pos >= list.length - 1) return clearInterval(msg_timer)

            pos++

            msg.classList.add('x')

            setTimeout(()=>{
                msg.textContent = list[pos]
                msg.classList.remove('x')
            }, 200)
        }, 1200)
    }, 1500)
}

/**
 * Виконує callback, коли заставка показалась мінімально потрібний час
 * @param {function} call
 */
function ready(call){
    let wait = started ? MIN_TIME - (Date.now() - started) : 0

    if(wait > 0) setTimeout(call, wait)
    else call()
}

function destroy(){
    clearTimeout(timer)
    clearInterval(msg_timer)
}

/**
 * Фон з контурних іконок (для екрану вибору мови)
 * @param {HTMLElement} holder
 */
function background(holder){
    let W = window.innerWidth, H = window.innerHeight
    let c = Math.round(Math.max(88, Math.min(108, W / 4)))
    let sz = Math.round(c * 0.46)
    let cols = Math.ceil(W / c) + 1, rows = Math.ceil(H / c) + 1
    let x0 = (W - (cols - 1) * c) / 2, y0 = (H - (rows - 1) * c) / 2
    let h = ''

    for(let r = 0; r < rows; r++){
        for(let k = 0; k < cols; k++){
            let cx = x0 + k * c + (r % 2 ? c / 2 : 0), cy = y0 + r * c
            let rot = (r + k) % 2 ? -12 : 12

            h += '<svg viewBox="0 0 24 24" style="width:' + sz + 'px;height:' + sz + 'px;left:' + Math.round(cx - sz / 2) + 'px;top:' + Math.round(cy - sz / 2) + 'px;transform:rotate(' + rot + 'deg)">' + icons[(k * 5 + r * 7) % icons.length] + '</svg>'
        }
    }

    holder.innerHTML = h
}

/**
 * Бренд (місяць + напис) для екрану вибору мови
 * @returns {string}
 */
function brand(){
    return moon + studio
}

export default {
    init,
    ready,
    destroy,
    background,
    brand
}
