import Api from '../../../core/api/api'
import Color from '../../../utils/color'

export default {
    onCreate: function(){
        document.body.classList.add('lampa-detail-active')
        document.documentElement.classList.add('lampa-detail-active')

        let applyPosterTheme = (image)=>{
            try{
                let palette = Color.palette(Color.get(image))
                let hsl = Color.rgbToHsl(palette.average[0], palette.average[1], palette.average[2])
                let bg = Color.hslToRgb(hsl[0], Math.min(hsl[1], 65), Math.min(24, Math.max(14, hsl[2] * 0.32)))

                document.documentElement.style.setProperty('--lampa-poster-bg', Color.rgbToHex(bg[0], bg[1], bg[2]))
                document.documentElement.style.setProperty('--lampa-poster-nav', Color.rgba(palette.average, 0.78))
            }
            catch(e){}
        }

        let im = this.html.find('.full--poster')
        let poster

        this.img_poster = im[0] || {}

        if(window.innerWidth <= 480){
            this.img_poster = new Image()
            this.img_poster.crossOrigin = "Anonymous"
        }

        this.img_poster.onerror = (e)=>{
            this.img_poster.src = './img/img_broken.svg'
        }

        this.img_poster.onload = (e)=>{
            im.parent().addClass('loaded')
        }

        if(window.innerWidth <= 480){
            if(this.card.backdrop_path) poster = Api.img(this.card.backdrop_path,'w780')
            else if(this.card.background_image) poster = this.card.background_image

            this.img_poster.onerror = (e)=>{
                this.img_poster = im[0]

                this.img_poster.onerror = (e)=>{
                    this.img_poster.src = './img/img_broken.svg'
                }
        
                this.img_poster.onload = (e)=>{
                    applyPosterTheme(this.img_poster)
                    im.parent().addClass('loaded').addClass('with-out')
                }

                im[0].src = poster || this.card.img
            }

                this.img_poster.onload = (e)=>{
                    applyPosterTheme(this.img_poster)

                    let draw = ()=>{
                    im.parent().addClass('loaded')

                    setTimeout(()=>{
                        im[0].style.transition = 'none'
                    },500)

                    let sc = this.html.parents('.scroll')[0]
                    let an = 0
                    let ts = 0
                    let dl = window.innerHeight * 0.1

                    let smoothParallax = ()=>{
                        im[0].style.transform = 'translate3d(0, ' + ts * 0.35 + 'px, 0)'
                        im[0].style.opacity   = ts >= dl ? Math.max(0, 1 - (ts - dl) / (window.innerHeight * 0.2)) : 1;

                        an--

                        if(an > 0) smoothParallax()
                    }

                    if(sc) sc.on('scroll', function(e) {
                        ts = sc.scrollTop
                        
                        if(an == 0){
                            an = 100

                            requestAnimationFrame(smoothParallax)
                        }
                    })
                }
                
                if(window.lampa_settings.blur_poster){
                    Color.blurPoster(this.img_poster, im.width(), im.height(), (nim)=>{
                        im[0].src = nim.src

                        draw()
                    })
                }
                else{
                    im[0].src = this.img_poster.src
                    
                    draw()
                }
            }
        }

        if(poster) this.html.find('.full-start__poster').addClass('background--poster')

        this.img_poster.src = poster || this.card.img
    },

    onDestroy: function(){
        document.body.classList.remove('lampa-detail-active')
        document.documentElement.classList.remove('lampa-detail-active')
        document.documentElement.style.removeProperty('--lampa-poster-bg')
        document.documentElement.style.removeProperty('--lampa-poster-nav')
    }
}
