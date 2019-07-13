import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from "@angular/platform-browser";

import { Web3Service } from './services/web3/web3.service';
import { UserService } from './services/user/user.service';
import { DaiService } from './services/dai/dai.service';
import { MedaoService } from './services/medao/medao.service';
import { ProfileService, Profile } from './services/profile/profile.service';

declare let web3: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

    ready: boolean = false;
    supportedNetworks = [42];

    constructor (
        private matIconRegistry: MatIconRegistry,
        private domSanitizer: DomSanitizer,
        public Web3: Web3Service,
        public Dai: DaiService,
        public Medao: MedaoService,
        public User: UserService,
    ) {
        this.Web3.initialize(this.supportedNetworks)
        .then(async () => {
            await this.Dai.initialize();
            await this.Medao.initialize();
            
            if(web3.currentAccount)
                await this.User.signIn();
            else
                this.Web3.watchForAccountChanges();

            console.log('App ready');
            this.ready = true;
        })
        .catch(err => {
            console.error(err);
            this.ready = true;
        })

        this.matIconRegistry.addSvgIcon("qrcode", this.domSanitizer.bypassSecurityTrustResourceUrl("./assets/qrcode.svg"));
    }

}
