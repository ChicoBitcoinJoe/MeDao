import { Component, OnInit, Input, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AppService } from '../../services/app/app.service';
import { Profile } from '../../services/profile/profile.service';

declare let web3: any;

export interface DialogData {
    identity: Profile,
    user: Profile
}

@Component({
  selector: 'app-profile-widget',
  templateUrl: './profile-widget.component.html',
  styleUrls: ['./profile-widget.component.scss']
})
export class ProfileWidgetComponent implements OnInit {

    @Input() App: AppService;
    @Input() identity: Profile;
    @Input() view: boolean;

    constructor(
        public dialog: MatDialog,
    ) { }

    async ngOnInit() {

    }

    now () {
        return Math.floor(new Date().getTime()/1000);
    }

    openQrcodeDialog () {
        const dialogRef = this.dialog.open(QrcodeDialog, {
            //width: '100vw',
            //height: '100vh',
            data: {
               identity: this.identity,
               user: this.App.user,
            }
        });

        dialogRef.afterClosed().subscribe(async result => {

        });
    }

    openTransferDialog () {
        const dialogRef = this.dialog.open(TransferDialog, {
            // width: '100vw',
            // height: '100vh',
            data: {
               identity: this.identity,
               user: this.App.user,
            }
        });

        dialogRef.afterClosed().subscribe(async tx => {
            if(!tx) return;

            tx.on('transactionHash', txHash => {
                console.log(txHash);
            })
            .on('confirmation', (confirmations, txReceipt) => {
                if(confirmations == 1){
                    console.log(txReceipt)
                    this.App.user.setTimeBalance(this.identity);
                }
            })
            .catch(err => {
                console.error(err);
            })
        });
    }

    copyUrlToClipboard () {

    }

    }

@Component({
    selector: 'transfer-dialog',
    templateUrl: 'transfer.dialog.html',
})
export class TransferDialog {

    identity: Profile;
    user: Profile;

    hours: number = 0;
    minutes: number = 0;
    seconds: number = 0;
    totalSeconds: number = 0;
    dollarValue: number = 0;

    maxHours: number = 0;
    maxMinutes: number = 0;
    maxSeconds: number = 0;

    sendAmount: number = 0;
    paymentSelection: string = null;
    toAddress: string = null;

    constructor(
        public dialogRef: MatDialogRef<TransferDialog>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData
    ) {
        this.identity = data.identity;
        this.user = data.user;
    }

    async updateDollarValue () {
        let totalSeconds = this.seconds;
        totalSeconds += this.minutes * 60;
        totalSeconds += this.hours * 60 * 60;
        this.totalSeconds = totalSeconds;
        this.sendAmount = web3.utils.toWei(totalSeconds.toString(), 'ether');
        let dollarValueInWei = await this.identity.medao.methods.calculateReserveClaim(this.sendAmount.toString()).call();
        this.dollarValue = web3.utils.fromWei(dollarValueInWei.toString(), 'ether');
    }

    transfer () {
        var tx = this.identity.medao.token.methods.transfer(this.toAddress, this.sendAmount)
        .send({
            from: web3.account
        });

        tx.on('transactionHash', txHash => {
            this.dialogRef.close(tx);
        })
    }

    valid () {
        if(!this.totalSeconds) return false;
        if(this.totalSeconds <= 0) return false;
        if(!this.toAddress) return false;
        if(!web3.utils.isAddress(this.toAddress)) return false;
        return true;
    }

}

@Component({
    selector: 'qrcode-dialog',
    templateUrl: 'qrcode.dialog.html',
})
export class QrcodeDialog {

    identity: any;
    address: string;

    constructor(
        public dialogRef: MatDialogRef<QrcodeDialog>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
    ) {
        this.identity = data.identity;
        this.address = data.identity.medao.address;
    }
}
